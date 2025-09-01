-- PostgreSQL Database Setup for Diagnóstico PDP
-- Heroku PostgreSQL compatible

-- Create usuarios table
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

-- Create evaluaciones table
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

-- Create respuestas_secciones table
CREATE TABLE IF NOT EXISTS respuestas_secciones (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones(id),
    seccion_numero INTEGER NOT NULL,
    pregunta_numero INTEGER NOT NULL,
    respuesta INTEGER NOT NULL,
    puntos_obtenidos INTEGER NOT NULL,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics_sesiones table
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

-- Create analytics_page_views table
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    pagina VARCHAR(100) NOT NULL,
    timestamp_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tiempo_permanencia_segundos INTEGER,
    ip_address INET
);

-- Create email_tracking table
CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones(id),
    email_destinatario VARCHAR(255) NOT NULL,
    asunto VARCHAR(500),
    estado VARCHAR(20) NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_mensaje TEXT
);

-- Create system_performance table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_usuario_id ON evaluaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON evaluaciones(fecha_evaluacion);
CREATE INDEX IF NOT EXISTS idx_respuestas_evaluacion_id ON respuestas_secciones(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_sesiones(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_evaluacion_id ON email_tracking(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_performance_endpoint ON system_performance(endpoint);

-- Create views for analytics
CREATE OR REPLACE VIEW vista_resumen_evaluaciones AS
SELECT 
    DATE(fecha_evaluacion) as fecha,
    COUNT(*) as total_evaluaciones,
    AVG(porcentaje_total) as promedio_cumplimiento,
    COUNT(CASE WHEN pdf_generado = TRUE THEN 1 END) as pdfs_generados,
    COUNT(CASE WHEN email_enviado = TRUE THEN 1 END) as emails_enviados
FROM evaluaciones 
GROUP BY DATE(fecha_evaluacion)
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW vista_industrias_populares AS
SELECT 
    u.industria,
    COUNT(*) as total_evaluaciones,
    AVG(e.porcentaje_total) as promedio_cumplimiento
FROM usuarios u
LEFT JOIN evaluaciones e ON u.id = e.usuario_id
GROUP BY u.industria
ORDER BY total_evaluaciones DESC;

CREATE OR REPLACE VIEW vista_abandono_por_seccion AS
SELECT 
    abandono_en_seccion as seccion,
    COUNT(*) as total_abandonos
FROM analytics_sesiones 
WHERE abandono_en_seccion IS NOT NULL
GROUP BY abandono_en_seccion
ORDER BY total_abandonos DESC;

-- Insert sample data for testing
INSERT INTO usuarios (nombre, apellido, email, telefono, empresa, industria, acepta_uso, acepta_contacto) 
VALUES 
    ('Juan', 'Pérez', 'juan.perez@test.com', '+57 300 123 4567', 'Empresa Test S.A.S.', 'Tecnología', TRUE, TRUE),
    ('María', 'González', 'maria.gonzalez@test.com', '+57 301 234 5678', 'Consultora ABC', 'Consultoría', TRUE, FALSE),
    ('Carlos', 'Rodríguez', 'carlos.rodriguez@test.com', '+57 302 345 6789', 'Industrias XYZ', 'Manufactura', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample evaluations
INSERT INTO evaluaciones (
    usuario_id, puntuacion_total, porcentaje_total, nivel_riesgo,
    puntuaciones_por_seccion, porcentajes_por_seccion, respuestas_completas,
    tiempo_completado_minutos, pdf_generado, email_enviado
) 
SELECT 
    u.id,
    85,
    80.95,
    'ALTO CUMPLIMIENTO/BAJO RIESGO',
    '{"seccion1": 12, "seccion2": 13, "seccion3": 11, "seccion4": 14, "seccion5": 12, "seccion6": 13, "seccion7": 10}'::jsonb,
    '{"seccion1": 80.0, "seccion2": 86.7, "seccion3": 73.3, "seccion4": 93.3, "seccion5": 80.0, "seccion6": 86.7, "seccion7": 66.7}'::jsonb,
    '{"seccion1": [3,3,3,3,0], "seccion2": [3,3,3,3,1], "seccion3": [3,3,3,2,0], "seccion4": [3,3,3,3,2], "seccion5": [3,3,3,3,0], "seccion6": [3,3,3,3,1], "seccion7": [3,3,3,1,0]}'::jsonb,
    25,
    TRUE,
    TRUE
FROM usuarios u 
WHERE u.email = 'juan.perez@test.com'
ON CONFLICT DO NOTHING; 