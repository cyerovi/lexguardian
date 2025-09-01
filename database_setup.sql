-- Database setup for Diagnóstico PDP
-- Enhanced schema with usage tracking and analytics

USE diagnostico_pdp;

-- Table for user registration
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    industria VARCHAR(100) NOT NULL,
    acepta_uso BOOLEAN DEFAULT FALSE,
    acepta_contacto BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_registro VARCHAR(45),
    user_agent TEXT,
    INDEX idx_email (email),
    INDEX idx_empresa (empresa),
    INDEX idx_fecha_registro (fecha_registro)
);

-- Table for evaluation results
CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    puntuacion_total INT NOT NULL,
    porcentaje_total DECIMAL(5,2) NOT NULL,
    nivel_riesgo ENUM('Alto Cumplimiento/Bajo Riesgo', 'Cumplimiento Medio/Riesgo Medio', 'Bajo Cumplimiento/Alto Riesgo', 'Nulo Cumplimiento/Altísimo Riesgo') NOT NULL,
    puntuaciones_por_seccion JSON NOT NULL,
    porcentajes_por_seccion JSON NOT NULL,
    respuestas_completas JSON NOT NULL,
    tiempo_completado_minutos INT,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_evaluacion VARCHAR(45),
    pdf_generado BOOLEAN DEFAULT FALSE,
    email_enviado BOOLEAN DEFAULT FALSE,
    fecha_pdf TIMESTAMP NULL,
    fecha_email TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_nivel_riesgo (nivel_riesgo),
    INDEX idx_fecha_evaluacion (fecha_evaluacion),
    INDEX idx_porcentaje_total (porcentaje_total)
);

-- Table for detailed section responses
CREATE TABLE IF NOT EXISTS respuestas_secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    seccion_numero INT NOT NULL,
    seccion_nombre VARCHAR(255) NOT NULL,
    pregunta_numero INT NOT NULL,
    pregunta_texto TEXT NOT NULL,
    respuesta_valor INT NOT NULL,
    respuesta_texto VARCHAR(50) NOT NULL,
    puntos_obtenidos INT NOT NULL,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    INDEX idx_evaluacion_id (evaluacion_id),
    INDEX idx_seccion_numero (seccion_numero),
    INDEX idx_respuesta_valor (respuesta_valor)
);

-- Table for usage analytics
CREATE TABLE IF NOT EXISTS analytics_sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    usuario_id INT NULL,
    pagina_inicial VARCHAR(100) NOT NULL,
    pagina_final VARCHAR(100),
    tiempo_sesion_segundos INT,
    paginas_visitadas JSON,
    acciones_realizadas JSON,
    dispositivo VARCHAR(50),
    navegador VARCHAR(100),
    sistema_operativo VARCHAR(100),
    resolucion_pantalla VARCHAR(20),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NULL,
    evaluacion_completada BOOLEAN DEFAULT FALSE,
    abandono_en_seccion INT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_inicio (fecha_inicio),
    INDEX idx_evaluacion_completada (evaluacion_completada)
);

-- Table for page views tracking
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    usuario_id INT NULL,
    pagina VARCHAR(100) NOT NULL,
    tiempo_permanencia_segundos INT,
    scroll_percentage INT,
    clicks_realizados INT DEFAULT 0,
    formulario_completado BOOLEAN DEFAULT FALSE,
    errores_encontrados JSON,
    timestamp_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timestamp_salida TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_pagina (pagina),
    INDEX idx_timestamp_entrada (timestamp_entrada)
);

-- Table for email tracking
CREATE TABLE IF NOT EXISTS email_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    email_destinatario VARCHAR(255) NOT NULL,
    asunto VARCHAR(500) NOT NULL,
    estado ENUM('enviado', 'fallido', 'rebotado') DEFAULT 'enviado',
    error_mensaje TEXT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_apertura TIMESTAMP NULL,
    fecha_descarga_pdf TIMESTAMP NULL,
    ip_apertura VARCHAR(45),
    user_agent_apertura TEXT,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    INDEX idx_evaluacion_id (evaluacion_id),
    INDEX idx_email_destinatario (email_destinatario),
    INDEX idx_estado (estado),
    INDEX idx_fecha_envio (fecha_envio)
);

-- Table for system performance monitoring
CREATE TABLE IF NOT EXISTS system_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    metodo VARCHAR(10) NOT NULL,
    tiempo_respuesta_ms INT NOT NULL,
    status_code INT NOT NULL,
    tamaño_respuesta_bytes INT,
    memoria_usada_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    timestamp_request TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_cliente VARCHAR(45),
    user_agent TEXT,
    INDEX idx_endpoint (endpoint),
    INDEX idx_timestamp_request (timestamp_request),
    INDEX idx_status_code (status_code)
);

-- Views for analytics dashboards
CREATE OR REPLACE VIEW vista_resumen_evaluaciones AS
SELECT 
    DATE(fecha_evaluacion) as fecha,
    COUNT(*) as total_evaluaciones,
    AVG(porcentaje_total) as promedio_cumplimiento,
    COUNT(CASE WHEN nivel_riesgo = 'Alto Cumplimiento/Bajo Riesgo' THEN 1 END) as alto_cumplimiento,
    COUNT(CASE WHEN nivel_riesgo = 'Cumplimiento Medio/Riesgo Medio' THEN 1 END) as medio_cumplimiento,
    COUNT(CASE WHEN nivel_riesgo = 'Bajo Cumplimiento/Alto Riesgo' THEN 1 END) as bajo_cumplimiento,
    COUNT(CASE WHEN nivel_riesgo = 'Nulo Cumplimiento/Altísimo Riesgo' THEN 1 END) as nulo_cumplimiento,
    COUNT(CASE WHEN pdf_generado = TRUE THEN 1 END) as pdfs_generados,
    COUNT(CASE WHEN email_enviado = TRUE THEN 1 END) as emails_enviados
FROM evaluaciones 
GROUP BY DATE(fecha_evaluacion)
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW vista_industrias_populares AS
SELECT 
    industria,
    COUNT(*) as total_usuarios,
    COUNT(DISTINCT e.id) as total_evaluaciones,
    AVG(e.porcentaje_total) as promedio_cumplimiento,
    MAX(u.fecha_registro) as ultima_actividad
FROM usuarios u
LEFT JOIN evaluaciones e ON u.id = e.usuario_id
GROUP BY industria
ORDER BY total_usuarios DESC;

CREATE OR REPLACE VIEW vista_abandono_por_seccion AS
SELECT 
    abandono_en_seccion as seccion,
    COUNT(*) as total_abandonos,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM analytics_sesiones WHERE abandono_en_seccion IS NOT NULL)), 2) as porcentaje_abandono
FROM analytics_sesiones 
WHERE abandono_en_seccion IS NOT NULL
GROUP BY abandono_en_seccion
ORDER BY seccion;

-- Insert sample data for testing (optional)
-- This will be used for development/testing purposes

-- Sample users
INSERT IGNORE INTO usuarios (nombre, apellido, email, telefono, empresa, industria, acepta_uso, acepta_contacto) VALUES
('Juan', 'Pérez', 'juan.perez@empresa1.com', '+57 300 123 4567', 'Empresa Demo 1', 'Tecnología', TRUE, TRUE),
('María', 'González', 'maria.gonzalez@empresa2.com', '+57 301 234 5678', 'Empresa Demo 2', 'Salud', TRUE, FALSE),
('Carlos', 'Rodríguez', 'carlos.rodriguez@empresa3.com', '+57 302 345 6789', 'Empresa Demo 3', 'Financiero', TRUE, TRUE);

-- Sample evaluations
INSERT IGNORE INTO evaluaciones (usuario_id, puntuacion_total, porcentaje_total, nivel_riesgo, puntuaciones_por_seccion, porcentajes_por_seccion, respuestas_completas, tiempo_completado_minutos, pdf_generado, email_enviado) VALUES
(1, 89, 84.76, 'Alto Cumplimiento/Bajo Riesgo', '[15, 14, 13, 15, 12, 10, 10]', '[100, 93, 87, 100, 80, 67, 67]', '{}', 25, TRUE, TRUE),
(2, 68, 64.76, 'Cumplimiento Medio/Riesgo Medio', '[10, 9, 11, 8, 12, 9, 9]', '[67, 60, 73, 53, 80, 60, 60]', '{}', 32, TRUE, TRUE),
(3, 37, 35.24, 'Bajo Cumplimiento/Alto Riesgo', '[6, 5, 5, 9, 3, 5, 4]', '[40, 33, 33, 60, 20, 33, 27]', '{}', 18, FALSE, FALSE);

COMMIT; 