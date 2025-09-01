/* Added global unhandledRejection handler */
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection:', reason); });

const express = require("express");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
/* Added startup log */
console.log("Starting server...");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(helmet({
  contentSecurityPolicy: false,
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Add headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Disable caching for HTML/JS/CSS to avoid stale deploys (must be BEFORE static)
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path === '/') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});

app.use(express.static("public"));
app.use(express.static(__dirname)); // Serve static files from root directory
app.use(cors({ 
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// (cache headers already set above)

// Database configuration - PostgreSQL for Heroku
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuración para nodemailer - use environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

// Middleware for analytics tracking
app.use(async (req, res, next) => {
  const startTime = Date.now();
  
  // Track page views and API calls
  const sessionId = req.headers['x-session-id'] || uuidv4();
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    
    try {
      // Log performance data
      await pool.query(
        `INSERT INTO system_performance 
        (endpoint, metodo, tiempo_respuesta_ms, status_code, ip_cliente, user_agent) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.path, req.method, responseTime, res.statusCode, ipAddress, userAgent]
      );
      
      // Track page views for HTML pages
      if (req.path.endsWith('.html') || req.path === '/' || req.path.startsWith('/seccion')) {
        const pageName = req.path === '/' ? 'index' : req.path.replace('.html', '').replace('/', '');
        
        await pool.query(
          `INSERT INTO analytics_page_views 
          (session_id, pagina, timestamp_entrada) 
          VALUES ($1, $2, NOW())`,
          [sessionId, pageName]
        );
      }
    } catch (error) {
      console.error('Error tracking analytics:', error);
    }
  });
  
  next();
});

// Endpoint para registro de usuarios
app.post("/api/registro", async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, empresa, industria, acepta_uso, acepta_contacto } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !telefono || !empresa || !industria) {
      return res.status(400).json({
        error: "Todos los campos son requeridos"
      });
    }

    // Validar email
    if (!email.includes('@')) {
      return res.status(400).json({
        error: "Email inválido"
      });
    }

    // Validar teléfono (formato básico)
    if (!/^[0-9+\-\s()]{6,20}$/.test(telefono)) {
      return res.status(400).json({
        error: "Formato de teléfono inválido"
      });
    }

    // Verificar si el email ya existe
    const { rows } = await pool.query(
      'SELECT COUNT(*) as count FROM usuarios WHERE email = $1',
      [email]
    );

    if (rows[0].count > 0) {
      return res.status(409).json({
        error: "Este email ya está registrado"
      });
    }

    // Insertar nuevo usuario
    const { rows: resultRows } = await pool.query(
      `INSERT INTO usuarios (
        nombre, apellido, email, telefono, empresa, 
        industria, acepta_uso, acepta_contacto, ip_registro, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [nombre, apellido, email, telefono, empresa, industria, acepta_uso ? 1 : 0, acepta_contacto ? 1 : 0, ipAddress, userAgent]
    );

    res.status(200).json({
      success: true,
      message: "Registro exitoso",
      userId: resultRows[0].id
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

// Endpoint para guardar evaluación
app.post("/api/guardar-evaluacion", async (req, res) => {
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
    } = req.body;
    
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Buscar usuario por email
    const { rows } = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    const usuarioId = rows.length > 0 ? rows[0].id : null;

    // Insertar evaluación
    const { rows: resultRows } = await pool.query(
      `INSERT INTO evaluaciones (
        usuario_id, puntuacion_total, porcentaje_total, nivel_riesgo,
        puntuaciones_por_seccion, porcentajes_por_seccion, respuestas_completas,
        tiempo_completado_minutos, ip_evaluacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        usuarioId, 
        puntuacionTotal, 
        porcentajeTotal, 
        nivelRiesgo,
        JSON.stringify(puntuacionesPorSeccion),
        JSON.stringify(porcentajesPorSeccion),
        JSON.stringify(respuestasCompletas),
        tiempoCompletado,
        ipAddress
      ]
    );

    res.status(200).json({
      success: true,
      message: "Evaluación guardada exitosamente",
      evaluacionId: resultRows[0].id
    });

  } catch (error) {
    console.error("Error guardando evaluación:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

// Endpoint para marcar PDF como generado
app.post("/api/marcar-pdf-generado", async (req, res) => {
  try {
    const { evaluacionId } = req.body;

    await pool.query(
      'UPDATE evaluaciones SET pdf_generado = TRUE, fecha_pdf = NOW() WHERE id = $1',
      [evaluacionId]
    );

    res.status(200).json({
      success: true,
      message: "PDF marcado como generado"
    });

  } catch (error) {
    console.error("Error marcando PDF:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

// Endpoint para enviar correo (enhanced)
app.post("/api/enviar-informe", async (req, res) => {
  try {
    const { email, nombre, empresa, pdf, evaluacionId } = req.body;

    if (!email || !pdf) {
      return res.status(400).json({
        error: "Email y PDF son requeridos",
      });
    }

    // Extraer la parte base64 del dataURI
    const base64Data = pdf.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Configurar el correo
    const mailOptions = {
      from: `Diagnóstico PDP <${process.env.EMAIL_USER || "latitudld@gmail.com"}>`,
      to: email,
      subject: `Informe de Evaluación de Protección de Datos - ${empresa || "Empresa"}`,
      html: `
        <h2>Estimado(a) ${nombre || "Usuario"},</h2>
        <p>Adjunto encontrará el informe de evaluación de protección de datos personales para ${empresa || "su empresa"}.</p>
        <p>Gracias por utilizar nuestro servicio.</p>
        <p><strong>Agencia43 S.A.S.</strong></p>
      `,
      attachments: [
        {
          filename: "Informe_Evaluacion_PDP.pdf",
          content: buffer,
        },
      ],
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    // Track email sending
    if (evaluacionId) {
      await pool.query(
        `INSERT INTO email_tracking (evaluacion_id, email_destinatario, asunto, estado) 
         VALUES ($1, $2, $3, $4)`,
        [evaluacionId, email, mailOptions.subject, 'enviado']
      );

      // Update evaluation record
      await pool.query(
        'UPDATE evaluaciones SET email_enviado = TRUE, fecha_email = NOW() WHERE id = $1',
        [evaluacionId]
      );
    }

    res.status(200).json({
      message: "Correo enviado exitosamente",
    });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    
    // Track failed email
    if (req.body.evaluacionId) {
      try {
        await pool.query(
          `INSERT INTO email_tracking (evaluacion_id, email_destinatario, asunto, estado, error_mensaje) 
           VALUES ($1, $2, $3, $4, $5)`,
          [req.body.evaluacionId, req.body.email, 'Informe de Evaluación de Protección de Datos', 'fallido', error.message]
        );
      } catch (trackError) {
        console.error("Error tracking failed email:", trackError);
      }
    }
    
    res.status(500).json({
      error: "Error al enviar correo",
      details: error.message,
    });
  }
});

// Analytics endpoints
app.get("/api/analytics/resumen", async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vista_resumen_evaluaciones LIMIT 30');
    const { rows: industriasRows } = await pool.query('SELECT * FROM vista_industrias_populares LIMIT 10');
    const { rows: abandonoRows } = await pool.query('SELECT * FROM vista_abandono_por_seccion');
    
    // Get total stats
    const { rows: totalStatsRows } = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_usuarios,
        COUNT(DISTINCT e.id) as total_evaluaciones,
        AVG(e.porcentaje_total) as promedio_cumplimiento,
        COUNT(CASE WHEN e.pdf_generado = TRUE THEN 1 END) as total_pdfs,
        COUNT(CASE WHEN e.email_enviado = TRUE THEN 1 END) as total_emails
      FROM usuarios u 
      LEFT JOIN evaluaciones e ON u.id = e.usuario_id
    `);

    res.json({
      resumenDiario: rows,
      industriasPopulares: industriasRows,
      abandonoPorSeccion: abandonoRows,
      estadisticasGenerales: totalStatsRows[0]
    });

  } catch (error) {
    console.error("Error obteniendo analytics:", error);
    res.status(500).json({
      error: "Error obteniendo analytics",
      details: error.message
    });
  }
});

// Endpoint para tracking de sesiones
app.post("/api/track-session", async (req, res) => {
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
    } = req.body;
    
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    await pool.query(
      `INSERT INTO analytics_sesiones 
      (session_id, pagina_inicial, pagina_final, tiempo_sesion_segundos, 
       paginas_visitadas, acciones_realizadas, ip_address, user_agent,
       evaluacion_completada, abandono_en_seccion) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId, 
        paginaInicial, 
        paginaFinal, 
        tiempoSesion,
        JSON.stringify(paginasVisitadas),
        JSON.stringify(accionesRealizadas),
        ipAddress,
        userAgent,
        evaluacionCompletada ? 1 : 0,
        abandonoEnSeccion
      ]
    );

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error tracking session:", error);
    res.status(500).json({
      error: "Error tracking session",
      details: error.message
    });
  }
});

// Serve main HTML files directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/seccion_uno', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_uno.html'));
});
app.get('/seccion_dos', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_dos.html'));
});
app.get('/seccion_tres', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_tres.html'));
});
app.get('/seccion_cuatro', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_cuatro.html'));
});
app.get('/seccion_cinco', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_cinco.html'));
});
app.get('/seccion_seis', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_seis.html'));
});
app.get('/seccion_siete', (req, res) => {
  res.sendFile(path.join(__dirname, 'seccion_siete.html'));
});
app.get('/resultados', (req, res) => {
  res.sendFile(path.join(__dirname, 'resultados.html'));
});
app.get('/instrucciones', (req, res) => {
  res.sendFile(path.join(__dirname, 'instrucciones.html'));
});

// Catch-all for 404
app.use((req, res, next) => {
  res.status(404).send('Página no encontrada');
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).json({
    error: "Error interno del servidor",
    details: err.message,
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log(`Analytics disponibles en http://localhost:${port}/api/analytics/resumen`);
});
