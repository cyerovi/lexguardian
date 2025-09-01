CREATE DATABASE IF NOT EXISTS diagnostico_pdp;
USE diagnostico_pdp;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    empresa VARCHAR(150) NOT NULL,
    industria VARCHAR(100) NOT NULL,
    acepta_uso TINYINT(1) NOT NULL,
    acepta_contacto TINYINT(1) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para almacenar los resultados de la evaluación
CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    porcentaje_global DECIMAL(5,2) NOT NULL,
    nivel_riesgo ENUM('ALTO', 'MEDIO', 'BAJO') NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla para almacenar los resultados por sección
CREATE TABLE IF NOT EXISTS resultados_secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    seccion VARCHAR(100) NOT NULL,
    puntuacion_total INT NOT NULL,
    porcentaje_seccion DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_evaluaciones_usuario ON evaluaciones(usuario_id);
CREATE INDEX idx_resultados_evaluacion ON resultados_secciones(evaluacion_id);