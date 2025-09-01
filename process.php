<?php
// Add CORS headers - Limitado a origen específico para mayor seguridad
header('Access-Control-Allow-Origin: http://localhost'); // Cambiar por tu dominio en producción
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

// Log de solicitud recibida
error_log("Solicitud recibida: " . json_encode($_POST));

// Database configuration - Usar variables de entorno o archivo de configuración en producción
$config = [
    'host' => 'localhost',
    'dbname' => 'diagnostico_pdp',
    'username' => 'root',
    'password' => ''
];

// Validate required fields
$required_fields = ['nombre', 'apellido', 'email', 'telefono', 'empresa', 'industria', 'aceptar-uso'];
$missing_fields = array_filter($required_fields, function($field) {
    return !isset($_POST[$field]) || empty(trim($_POST[$field]));
});

if (!empty($missing_fields)) {
    http_response_code(400);
    echo json_encode(['error' => 'Campos requeridos faltantes', 'fields' => $missing_fields]);
    exit();
}

// Validate email
if (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email inválido']);
    exit();
}

// Validate phone number (formato básico)
if (!preg_match('/^[0-9+\-\s()]{6,20}$/', $_POST['telefono'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Formato de teléfono inválido']);
    exit();
}

try {
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4";
    $conn = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // Verificar si el email ya existe
    $checkEmail = $conn->prepare("SELECT COUNT(*) FROM usuarios WHERE email = :email");
    $checkEmail->execute([':email' => $_POST['email']]);
    if ($checkEmail->fetchColumn() > 0) {
        http_response_code(409); // Conflict
        echo json_encode(['error' => 'Este email ya está registrado']);
        exit();
    }
    
    $stmt = $conn->prepare("
        INSERT INTO usuarios (
            nombre, apellido, email, telefono, empresa, 
            industria, acepta_uso, acepta_contacto
        ) VALUES (
            :nombre, :apellido, :email, :telefono, :empresa,
            :industria, :acepta_uso, :acepta_contacto
        )
    ");
    
    $stmt->execute([
        ':nombre' => htmlspecialchars(trim($_POST['nombre'])),
        ':apellido' => htmlspecialchars(trim($_POST['apellido'])),
        ':email' => filter_var($_POST['email'], FILTER_SANITIZE_EMAIL),
        ':telefono' => htmlspecialchars(trim($_POST['telefono'])),
        ':empresa' => htmlspecialchars(trim($_POST['empresa'])),
        ':industria' => htmlspecialchars(trim($_POST['industria'])),
        ':acepta_uso' => isset($_POST['aceptar-uso']) ? 1 : 0,
        ':acepta_contacto' => isset($_POST['contacto']) ? 1 : 0
    ]);
    
    // Registrar éxito en el log
    error_log("Usuario registrado exitosamente: " . $_POST['email']);
    
    http_response_code(200);
    echo json_encode([
        'success' => true, 
        'redirect' => 'instrucciones.html',
        'message' => 'Registro exitoso'
    ]);
    
} catch (PDOException $e) {
    $errorCode = $e->getCode();
    $errorMessage = $e->getMessage();
    
    // Loguear error detallado
    error_log("Database Error ({$errorCode}): " . $errorMessage);
    
    // Error 1062 = Duplicate entry
    if ($errorCode == 1062) {
        http_response_code(409); // Conflict
        echo json_encode(['error' => 'Este email ya está registrado']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error interno del servidor']);
    }
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

