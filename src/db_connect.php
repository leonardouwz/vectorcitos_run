<?php
// Habilitar CORS y configuraciones de respuesta
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Constantes
define('MIN_PASSWORD_LENGTH', 6);
define('MIN_USERNAME_LENGTH', 3);

class Database {
    private static $instance = null;
    private $connection;

    // Parámetros de conexión
    private $host = 'localhost';
    private $user = 'vectorcito';
    private $password = '12345678';
    private $database = 'vectorcitos_run';

    // Constructor privado
    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host={$this->host};dbname={$this->database};charset=utf8", 
                $this->user, 
                $this->password
            );
            $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die("Error de conexión: " . $e->getMessage());
        }
    }

    // Obtener instancia singleton
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Método para ejecutar consultas
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log('Error en la consulta: ' . $e->getMessage());
            throw $e;
        }
    }

    // Método para cerrar la conexión
    public function __destruct() {
        $this->connection = null;
    }
}

// Funciones de validación
function isValidUsername($username) {
    return strlen($username) >= MIN_USERNAME_LENGTH;
}

function isValidPassword($password) {
    return strlen($password) >= MIN_PASSWORD_LENGTH;
}

function calculateUnlockedLevelsNumber($unlockedLevels) {
    return 
        ($unlockedLevels['easy'] * 100) + 
        ($unlockedLevels['medium'] * 10) + 
        $unlockedLevels['hard'];
}

function generateUserId() {
    return 'U' . str_pad(mt_rand(0, 999999999), 9, '0', STR_PAD_LEFT);
}

// Manejar solicitudes
function handleRequest() {
    // Validar método OPTIONS (preflight)
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // Obtener datos de la solicitud
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    // Verificar si se recibieron datos
    if (!$input) {
        sendResponse([
            'success' => false, 
            'message' => 'Datos de solicitud inválidos'
        ]);
        return;
    }

    // Obtener instancia de base de datos
    $db = Database::getInstance();

    // Respuesta por defecto
    $response = ['success' => false, 'message' => 'Acción no válida'];

    // Manejar diferentes acciones
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            switch ($input['action']) {
                case 'register':
                    // Validar campos requeridos
                    if (empty($input['username']) || empty($input['password'])) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Nombre de usuario y contraseña son obligatorios'
                        ]);
                        return;
                    }

                    // Validar longitud del nombre de usuario
                    if (!isValidUsername($input['username'])) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Nombre de usuario demasiado corto'
                        ]);
                        return;
                    }

                    // Validar contraseña
                    if (!isValidPassword($input['password'])) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Contraseña demasiado corta'
                        ]);
                        return;
                    }

                    // Verificar si el usuario existe
                    $existingUser = $db->query(
                        "SELECT COUNT(*) as count FROM usuarios WHERE BINARY username = ?", 
                        [$input['username']]
                    );

                    if ($existingUser[0]['count'] > 0) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'El nombre de usuario ya existe'
                        ]);
                        return;
                    }

                    // Generar ID de usuario
                    $userId = generateUserId();
                    
                    $hashedPassword = md5($password);

                    // Insertar nuevo usuario
                    $db->query(
                        "INSERT INTO usuarios (ID_User, username, password, dataTime, unlockedLevels) VALUES (?, ?, ?, NOW(), ?)", 
                        [$userId, $input['username'], $hashedPassword, 1]
                    );

                    sendResponse([
                        'success' => true, 
                        'message' => 'Usuario registrado',
                        'userId' => $userId
                    ]);
                    break;

                case 'login':
                    // Validar campos requeridos
                    if (empty($input['username']) || empty($input['password'])) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Nombre de usuario y contraseña son obligatorios'
                        ]);
                        return;
                    }

                    // Buscar usuario
                    $users = $db->query(
                        "SELECT * FROM usuarios WHERE BINARY username = ? LIMIT 1", 
                        [$input['username']]
                    );

                    if (empty($users)) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Usuario no encontrado'
                        ]);
                        return;
                    }

                    $user = $users[0];
                    
                    $hashedPassword = md5($password);

                    // Verificar contraseña
                    if ($user['password'] !== $hashedPassword) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Contraseña incorrecta'
                        ]);
                        return;
                    }

                    sendResponse([
                        'success' => true, 
                        'message' => 'Inicio de sesión exitoso',
                        'user' => [
                            'ID_User' => $user['ID_User'],
                            'username' => $user['username'],
                            'unlockedLevels' => intval($user['unlockedLevels'])
                        ]
                    ]);
                    break;

                case 'update_levels':
                    // Validar campos requeridos
                    if (empty($input['userId']) || !isset($input['totalUnlockedLevels'])) {
                        sendResponse([
                            'success' => false, 
                            'message' => 'Datos de actualización incompletos'
                        ]);
                        return;
                    }

                    // Actualizar niveles desbloqueados
                    $db->query(
                        "UPDATE usuarios SET unlockedLevels = ? WHERE ID_User = ?", 
                        [$input['totalUnlockedLevels'], $input['userId']]
                    );

                    sendResponse([
                        'success' => true, 
                        'message' => 'Niveles actualizados',
                        'totalUnlockedLevels' => $input['totalUnlockedLevels']
                    ]);
                    break;

                default:
                    sendResponse([
                        'success' => false, 
                        'message' => 'Acción no reconocida'
                    ]);
            }
        } catch (Exception $e) {
            sendResponse([
                'success' => false, 
                'message' => 'Error del servidor: ' . $e->getMessage()
            ]);
        }
    } else {
        sendResponse([
            'success' => false, 
            'message' => 'Método no permitido'
        ]);
    }
}

// Función para enviar respuesta JSON
function sendResponse($response) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response);
    exit;
}

// Ejecutar solicitud
handleRequest();
?>
