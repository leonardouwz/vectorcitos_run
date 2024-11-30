<?php
error_reporting(E_ALL); // Mostrar errores
ini_set('display_errors', 1);


// Conexión con la base de datos
$servername = "localhost";
$username = "vectorcito";
$password = "12345678";
$dbname = "vectorcitos_run";

$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Obtener parámetros con valores predeterminados si no existen
$tiempo = $_GET['tiempo'] ?? 'No disponible';
$errores = $_GET['errores'] ?? 0;
$aciertos = $_GET['aciertos'] ?? 0;
$totalPalabras = $_GET['totalPalabras'] ?? 1; // Evitar división por cero
$nivel_id = $_GET['nivel_id'] ?? null;

// Calcular estrellas según los aciertos en primer intento
$tercioPalabras = $totalPalabras / 3;
$estrellas = 0;

if ($aciertos >= 2 * $tercioPalabras) {
    $estrellas = 3;
} elseif ($aciertos >= $tercioPalabras) {
    $estrellas = 2;
} elseif ($aciertos > 0) {
    $estrellas = 1;
}
// Salida HTML con PHP
echo '<header class="main-page-header">';
echo '    <h3>RESULTADOS DEL NIVEL</h3>';
echo '</header>';

echo '<div class="result-stats">';
echo '    <p>Total de Palabras: <span id="totalPalabras">' . $totalPalabras . ' palabras</span></p>';
echo '    <p>Errores Cometidos: <span id="errores">' . $errores . ' </span></p>';
echo '    <p>Palabras Correctas: <span id="aciertos">' . $aciertos . '</span></p>';
echo '    <p>Tiempo Total: <span id="tiempo">' . $tiempo . ' segundos</span></p>';
echo "<p>Puntaje en estrellas: ";
for ($i = 0; $i < $estrellas; $i++) {
    echo "⭐";
}
echo "</p>";

echo '</div>';


// Intentar desbloquear el siguiente nivel si nivel_id está disponible
if ($nivel_id !== null) {
    $siguiente_nivel_id = $nivel_id + 1; // Determinar el siguiente nivel inmediato

    // Verificar si el siguiente nivel ya está desbloqueado
    $sql_verificar_nivel = "SELECT desbloqueado FROM niveles WHERE id = $siguiente_nivel_id";
    $resultado_verificar_nivel = $conn->query($sql_verificar_nivel);

    if ($resultado_verificar_nivel->num_rows > 0) {
        $siguiente_nivel = $resultado_verificar_nivel->fetch_assoc();

        if ($siguiente_nivel['desbloqueado'] == '0') {
            // Desbloquear el siguiente nivel
            $sql_desbloquear_nivel = "UPDATE niveles SET desbloqueado = '1' WHERE id = $siguiente_nivel_id";
            if ($conn->query($sql_desbloquear_nivel) === TRUE) {
                echo "<p>¡Nivel {$siguiente_nivel_id} desbloqueado!</p>";
            } else {
                echo "<p>Error al desbloquear el siguiente nivel: " . $conn->error . "</p>";
            }
        } else {
            echo "<p>El siguiente nivel (Nivel {$siguiente_nivel_id}) ya está desbloqueado.</p>";
        }
    } else {
        echo "<p>No hay más niveles para desbloquear.</p>";
    }
} else {
    echo "<p>ID del nivel no proporcionado, no se puede desbloquear el siguiente nivel.</p>";
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
         
        <!-- Botón para ir al menú principal -->
        
        <div class="button-group">
        	<button onclick="window.location.href='pagina_principal.php'">Menú Principal</button>
		<?php if ($nivel_id !== null): ?>
		    <a href="jugar.php?id=<?php echo $nivel_id; ?>" class="button play-button">Volver a Jugar</a>
		<?php endif; ?>
         </div>
   </main>
</body>
</html>
