import express, { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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
app.use(express.static(path.join(process.cwd())));

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

// Helper to send HTML with strict no-store headers
function sendNoStoreHTML(res: Response, file: string) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), file), { cacheControl: false });
}

// Routes (HTML)
app.get('/', (_req: Request, res: Response) => sendNoStoreHTML(res, 'index.html'));
app.get('/seccion_uno', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_uno.html'));
app.get('/seccion_dos', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_dos.html'));
app.get('/seccion_tres', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_tres.html'));
app.get('/seccion_cuatro', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_cuatro.html'));
app.get('/seccion_cinco', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_cinco.html'));
app.get('/seccion_seis', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_seis.html'));
app.get('/seccion_siete', (_req: Request, res: Response) => sendNoStoreHTML(res, 'seccion_siete.html'));
app.get('/resultados', (_req: Request, res: Response) => sendNoStoreHTML(res, 'resultados.html'));
app.get('/instrucciones', (_req: Request, res: Response) => sendNoStoreHTML(res, 'instrucciones.html'));

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


