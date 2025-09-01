-- Essential tables for PDP Diagnostico app
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    industria VARCHAR(100) NOT NULL,
    acepta_uso BOOLEAN DEFAULT FALSE,
    acepta_contacto BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_registro INET,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS evaluaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    puntuacion_total INTEGER NOT NULL,
    porcentaje_total DECIMAL(5,2) NOT NULL,
    nivel_riesgo VARCHAR(50) NOT NULL,
    puntuaciones_por_seccion JSONB,
    porcentajes_por_seccion JSONB,
    respuestas_completas JSONB,
    tiempo_completado_minutos INTEGER,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_evaluacion INET,
    pdf_generado BOOLEAN DEFAULT FALSE,
    fecha_pdf TIMESTAMP,
    email_enviado BOOLEAN DEFAULT FALSE,
    fecha_email TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_performance (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    metodo VARCHAR(10) NOT NULL,
    tiempo_respuesta_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    ip_cliente INET,
    user_agent TEXT,
    timestamp_request TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_page_views (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    pagina VARCHAR(100) NOT NULL,
    timestamp_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tiempo_permanencia_segundos INTEGER,
    ip_address INET
);

CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones(id),
    email_destinatario VARCHAR(255) NOT NULL,
    asunto VARCHAR(500),
    estado VARCHAR(20) NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_mensaje TEXT
);

CREATE TABLE IF NOT EXISTS analytics_sesiones (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    pagina_inicial VARCHAR(100),
    pagina_final VARCHAR(100),
    tiempo_sesion_segundos INTEGER,
    paginas_visitadas JSONB,
    acciones_realizadas JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluacion_completada BOOLEAN DEFAULT FALSE,
    abandono_en_seccion VARCHAR(50)
); 

-- Optional analytics views (safe to run multiple times)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vista_resumen_evaluaciones') THEN
    EXECUTE $$
      CREATE VIEW vista_resumen_evaluaciones AS
      SELECT 
        DATE_TRUNC('day', CURRENT_TIMESTAMP)::date AS fecha,
        COUNT(e.id) FILTER (WHERE e.fecha_pdf IS NOT NULL) AS pdfs_generados,
        COUNT(e.id) FILTER (WHERE e.email_enviado IS TRUE) AS emails_enviados,
        AVG(e.porcentaje_total) AS promedio_cumplimiento
      FROM evaluaciones e;
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vista_industrias_populares') THEN
    EXECUTE $$
      CREATE VIEW vista_industrias_populares AS
      SELECT industria, COUNT(*) AS total
      FROM usuarios
      WHERE industria IS NOT NULL AND industria <> ''
      GROUP BY industria
      ORDER BY total DESC
      LIMIT 10;
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vista_abandono_por_seccion') THEN
    EXECUTE $$
      CREATE VIEW vista_abandono_por_seccion AS
      SELECT 'seccion_uno'::text AS seccion, 0::int AS abandonos
      UNION ALL SELECT 'seccion_dos', 0
      UNION ALL SELECT 'seccion_tres', 0
      UNION ALL SELECT 'seccion_cuatro', 0
      UNION ALL SELECT 'seccion_cinco', 0
      UNION ALL SELECT 'seccion_seis', 0
      UNION ALL SELECT 'seccion_siete', 0;
    $$;
  END IF;
END $$;

-- Evidence table to store uploaded files metadata
CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  evaluacion_id INTEGER REFERENCES evaluaciones(id) ON DELETE CASCADE,
  seccion INTEGER NOT NULL,
  pregunta INTEGER NOT NULL,
  filename VARCHAR(512) NOT NULL,
  content_type VARCHAR(255),
  storage_key VARCHAR(1024) UNIQUE NOT NULL,
  size_bytes BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_eval ON evidence(evaluacion_id);