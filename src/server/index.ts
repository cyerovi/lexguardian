import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

// Environment
const port: number = Number(process.env.PORT || 3000);

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// CORS
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true;
app.use(cors({ origin: corsOrigin, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Requested-With'] }));

// Static
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path === '/') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});
app.use(express.static('public'));
// Serve built React app from client/dist in production
const clientDistPath = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDistPath));

// DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false as any
});

// Mail
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// S3 / MinIO client
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || ''
  }
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'lexguardian-local';

// Ensure bucket exists (MinIO)
(async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
      // no-op if created
    } catch (err) {
      // log but don't crash server
      console.error('S3 bucket ensure failed:', (err as Error).message);
    }
  }
})();

// Helper to send HTML with strict no-store headers
function sendNoStoreHTML(res: Response, file: string) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), file), { cacheControl: false });
}

// Routes (HTML)
// React SPA fallback for non-API routes except resultados
app.get(['/', '/seccion_uno','/seccion_dos','/seccion_tres','/seccion_cuatro','/seccion_cinco','/seccion_seis','/seccion_siete','/instrucciones'], (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Serve resultados.html from project root to reuse existing charts and logic
app.get('/resultados', (_req: Request, res: Response) => {
  sendNoStoreHTML(res, 'resultados.html');
});

// Generate PDF of results page
app.post('/api/pdf/resultados', async (req: Request, res: Response) => {
  try {
    const baseUrl = `http://localhost:${port}/resultados`;
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    // Propagate localStorage payload if provided
    const { usuarioData, secciones, resultadosCalculados } = (req.body as any) || {};
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    if (usuarioData || secciones || resultadosCalculados) {
      await page.evaluate(({ usuarioData, secciones, resultadosCalculados }) => {
        try {
          if (usuarioData) localStorage.setItem('usuarioData', JSON.stringify(usuarioData));
          if (secciones) {
            const keys = ['seccion1Form','seccion2Form','seccion3Form','seccion4Form','seccion5Form','seccion6Form','seccion7Form'];
            keys.forEach((k, i) => { if (secciones[i]) localStorage.setItem(k, JSON.stringify(secciones[i])); });
          }
          if (resultadosCalculados) localStorage.setItem('resultadosCalculados', JSON.stringify(resultadosCalculados));
        } catch {}
      }, { usuarioData, secciones, resultadosCalculados });
      await page.reload({ waitUntil: 'networkidle2' });
    }
    // Give charts time to render
    await new Promise((r) => setTimeout(r, 800));
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Informe_Evaluacion_PDP.pdf"');
    res.send(pdf);
  } catch (err: any) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF', details: err.message });
  }
});

// Email PDF
app.post('/api/email/resultados', async (req: Request, res: Response) => {
  try {
    const { email, nombre, empresa, usuarioData, secciones, resultadosCalculados } = (req.body as any) || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    // Generate PDF via headless browser
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/resultados`, { waitUntil: 'networkidle2' });
    if (usuarioData || secciones || resultadosCalculados) {
      await page.evaluate(({ usuarioData, secciones, resultadosCalculados }) => {
        try {
          if (usuarioData) localStorage.setItem('usuarioData', JSON.stringify(usuarioData));
          if (secciones) {
            const keys = ['seccion1Form','seccion2Form','seccion3Form','seccion4Form','seccion5Form','seccion6Form','seccion7Form'];
            keys.forEach((k, i) => { if (secciones[i]) localStorage.setItem(k, JSON.stringify(secciones[i])); });
          }
          if (resultadosCalculados) localStorage.setItem('resultadosCalculados', JSON.stringify(resultadosCalculados));
        } catch {}
      }, { usuarioData, secciones, resultadosCalculados });
      await page.reload({ waitUntil: 'networkidle2' });
    }
    await new Promise((r) => setTimeout(r, 800));
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    await transporter.sendMail({
      from: `Diagnóstico PDP <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Informe de Evaluación de Protección de Datos - ${empresa || 'Empresa'}`,
      html: `<p>Estimado(a) ${nombre || 'Usuario'}, adjuntamos su informe de evaluación PDP.</p>`,
      attachments: [{ filename: 'Informe_Evaluacion_PDP.pdf', content: Buffer.from(pdf) }]
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'No se pudo enviar el email', details: err.message });
  }
});

// API (minimal typings, same behavior)
app.post('/api/registro', async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, telefono, empresa, industria, acepta_uso, acepta_contacto } = req.body as Record<string, any>;
    if (!nombre || !apellido || !email || !telefono || !empresa || !industria) return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (!String(email).includes('@')) return res.status(400).json({ error: 'Email inválido' });
    if (!/^[0-9+\-\s()]{6,20}$/.test(String(telefono))) return res.status(400).json({ error: 'Formato de teléfono inválido' });

    const { rows } = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE email = $1', [email]);
    if (Number(rows?.[0]?.count || 0) > 0) return res.status(409).json({ error: 'Este email ya está registrado' });

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, telefono, empresa, industria, acepta_uso, acepta_contacto) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [nombre, apellido, email, telefono, empresa, industria, acepta_uso ? 1 : 0, acepta_contacto ? 1 : 0]
    );
    res.status(200).json({ success: true, message: 'Registro exitoso', userId: result.rows[0].id });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error interno del servidor', details: (error as Error).message });
  }
});

app.post('/api/enviar-informe', async (req: Request, res: Response) => {
  try {
    const { email, nombre, empresa, pdf } = req.body as Record<string, any>;
    if (!email || !pdf) return res.status(400).json({ error: 'Email y PDF son requeridos' });
    const base64Data = String(pdf).split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    await transporter.sendMail({
      from: `Diagnóstico PDP <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Informe de Evaluación de Protección de Datos - ${empresa || 'Empresa'}`,
      attachments: [{ filename: 'Informe_Evaluacion_PDP.pdf', content: buffer }]
    });
    res.status(200).json({ message: 'Correo enviado exitosamente' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error al enviar correo', details: (error as Error).message });
  }
});

// Save evaluation
app.post('/api/guardar-evaluacion', async (req: Request, res: Response) => {
  try {
    const {
      email,
      puntuacionTotal,
      porcentajeTotal,
      nivelRiesgo,
      puntuacionesPorSeccion,
      porcentajesPorSeccion,
      respuestasCompletas,
      tiempoCompletado
    } = req.body as Record<string, any>;

    const userRow = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    const usuarioId = userRow.rows?.[0]?.id || null;

    const result = await pool.query(
      `INSERT INTO evaluaciones (
        usuario_id, puntuacion_total, porcentaje_total, nivel_riesgo,
        puntuaciones_por_seccion, porcentajes_por_seccion, respuestas_completas,
        tiempo_completado_minutos
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        usuarioId,
        puntuacionTotal,
        porcentajeTotal,
        nivelRiesgo,
        JSON.stringify(puntuacionesPorSeccion),
        JSON.stringify(porcentajesPorSeccion),
        JSON.stringify(respuestasCompletas),
        tiempoCompletado
      ]
    );

    res.status(200).json({ success: true, message: 'Evaluación guardada exitosamente', evaluacionId: result.rows[0].id });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error interno del servidor', details: (error as Error).message });
  }
});

// Mark PDF generated
app.post('/api/marcar-pdf-generado', async (req: Request, res: Response) => {
  try {
    const { evaluacionId } = req.body as Record<string, any>;
    await pool.query('UPDATE evaluaciones SET pdf_generado = TRUE, fecha_pdf = NOW() WHERE id = $1', [evaluacionId]);
    res.status(200).json({ success: true, message: 'PDF marcado como generado' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error interno del servidor', details: (error as Error).message });
  }
});

// Evidence: presign upload URL
app.post('/api/evidence/presign', async (req: Request, res: Response) => {
  try {
    const { evaluacionId, seccion, pregunta, filename, contentType } = req.body as Record<string, any>;
    if (!evaluacionId || typeof seccion !== 'number' || typeof pregunta !== 'number' || !filename) {
      return res.status(400).json({ error: 'evaluacionId, seccion, pregunta y filename son requeridos' });
    }

    const safeExt = String(filename).includes('.') ? String(filename).split('.').pop() : (mime.extension(contentType || '') || 'bin');
    const storageKey = `evidence/${evaluacionId}/${Date.now()}_${uuidv4()}.${safeExt}`;

    const putCmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
      ContentType: contentType || mime.lookup(String(filename)) || 'application/octet-stream'
    });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 });
    return res.json({ url, storageKey, expiresIn: 300 });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error generando URL de carga', details: (error as Error).message });
  }
});

// Evidence: record metadata after successful upload
app.post('/api/evidence/record', async (req: Request, res: Response) => {
  try {
    const { evaluacionId, seccion, pregunta, storageKey, filename, contentType, sizeBytes } = req.body as Record<string, any>;
    if (!evaluacionId || typeof seccion !== 'number' || typeof pregunta !== 'number' || !storageKey || !filename) {
      return res.status(400).json({ error: 'Campos requeridos: evaluacionId, seccion, pregunta, storageKey, filename' });
    }

    await pool.query(
      `INSERT INTO evidence (
        evaluacion_id, seccion, pregunta, filename, content_type, storage_key, size_bytes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (storage_key) DO NOTHING`,
      [evaluacionId, seccion, pregunta, filename, contentType || null, storageKey, sizeBytes || null]
    );

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error guardando evidencia', details: (error as Error).message });
  }
});

// Evidence: upload proxy (base64 body) to avoid CORS issues
app.post('/api/evidence/upload-proxy', async (req: Request, res: Response) => {
  try {
    const { storageKey, base64Data, contentType } = req.body as Record<string, any>;
    if (!storageKey || !base64Data) return res.status(400).json({ error: 'storageKey y base64Data son requeridos' });
    const buffer = Buffer.from(String(base64Data), 'base64');
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream'
    }));
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error subiendo evidencia', details: (error as Error).message });
  }
});

// Evidence: list by evaluacion
app.get('/api/evidence/:evaluacionId', async (req: Request, res: Response) => {
  try {
    const evaluacionId = Number(req.params.evaluacionId);
    if (!Number.isFinite(evaluacionId)) return res.status(400).json({ error: 'evaluacionId inválido' });
    const { rows } = await pool.query(
      'SELECT id, evaluacion_id, seccion, pregunta, filename, content_type, storage_key, size_bytes, uploaded_at FROM evidence WHERE evaluacion_id = $1 ORDER BY uploaded_at DESC',
      [evaluacionId]
    );
    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error listando evidencias', details: (error as Error).message });
  }
});

// Evidence: get download URL
app.get('/api/evidence/download-url', async (req: Request, res: Response) => {
  try {
    const storageKey = String(req.query.key || '');
    if (!storageKey) return res.status(400).json({ error: 'key es requerido' });
    const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: storageKey });
    const url = await getSignedUrl(s3, getCmd, { expiresIn: 60 * 5 });
    res.json({ url, expiresIn: 300 });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error generando URL de descarga', details: (error as Error).message });
  }
});

// Analytics summary (optional views)
app.get('/api/analytics/resumen', async (_req: Request, res: Response) => {
  const empty: {
    resumenDiario: any[];
    industriasPopulares: any[];
    abandonoPorSeccion: any[];
    estadisticasGenerales: Record<string, any>;
  } = { resumenDiario: [], industriasPopulares: [], abandonoPorSeccion: [], estadisticasGenerales: {} };
  try {
    let resumen = empty.resumenDiario;
    let industrias = empty.industriasPopulares;
    let abandono = empty.abandonoPorSeccion;
    let totales: any = empty.estadisticasGenerales;

    try { resumen = (await pool.query('SELECT * FROM vista_resumen_evaluaciones LIMIT 30')).rows; } catch { /* fallback empty */ }
    try { industrias = (await pool.query('SELECT * FROM vista_industrias_populares LIMIT 10')).rows; } catch { /* fallback empty */ }
    try { abandono = (await pool.query('SELECT * FROM vista_abandono_por_seccion')).rows; } catch { /* fallback empty */ }
    try {
      const t = await pool.query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_usuarios,
          COUNT(DISTINCT e.id) as total_evaluaciones,
          AVG(e.porcentaje_total) as promedio_cumplimiento,
          COUNT(CASE WHEN e.pdf_generado = TRUE THEN 1 END) as total_pdfs,
          COUNT(CASE WHEN e.email_enviado = TRUE THEN 1 END) as total_emails
        FROM usuarios u 
        LEFT JOIN evaluaciones e ON u.id = e.usuario_id`);
      totales = t.rows?.[0] || {};
    } catch { /* fallback empty */ }

    res.json({ resumenDiario: resumen, industriasPopulares: industrias, abandonoPorSeccion: abandono, estadisticasGenerales: totales });
  } catch (error: unknown) {
    // As a last resort, still return empty payload with 200
    res.json(empty);
  }
});

// Track session
app.post('/api/track-session', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      paginaInicial,
      paginaFinal,
      tiempoSesion,
      paginasVisitadas,
      accionesRealizadas,
      evaluacionCompletada,
      abandonoEnSeccion
    } = req.body as Record<string, any>;

    await pool.query(
      `INSERT INTO analytics_sesiones 
       (session_id, pagina_inicial, pagina_final, tiempo_sesion_segundos, 
        paginas_visitadas, acciones_realizadas, evaluacion_completada, abandono_en_seccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        sessionId,
        paginaInicial,
        paginaFinal,
        tiempoSesion,
        JSON.stringify(paginasVisitadas),
        JSON.stringify(accionesRealizadas),
        evaluacionCompletada ? 1 : 0,
        abandonoEnSeccion
      ]
    );

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Error tracking session', details: (error as Error).message });
  }
});
// Errors
app.use((_req: Request, res: Response) => res.status(404).send('Página no encontrada'));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ error: 'Error interno del servidor', details: (err as Error).message }));

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});


