<?php
error_reporting(E_ALL); // Reportar todos los errores
ini_set('display_errors', 1); // Mostrar errores en pantalla

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

// Obtener el id del nivel desde la URL
if (isset($_GET['id'])) {
    $nivel_id = $_GET['id'];

    // Obtener el texto (ahora 'descripcion') del nivel desde la base de datos
    $sql = "SELECT descripcion FROM niveles WHERE id = '$nivel_id'";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $nivel = $result->fetch_assoc();
        $descripcion = $nivel['descripcion']; // El texto a mecanografiar
    } else {
        echo "Nivel no encontrado.";
        exit;
    }
} else {
    echo "ID de nivel no proporcionado.";
    exit;
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Juego de Mecanografía</title>
    <link rel="stylesheet" href="styles.css">
    <script>
        let tiempoInicio;
        let palabras = <?php echo json_encode(explode(" ", $descripcion)); ?>;
        let palabraActual = 0;
        let palabrasEscritas = 0;
        let tiempoEscrito = 0;
        let errores = 0;
        let aciertosPrimerIntento = 0;
        let intentoActualCorrecto = true; // Para verificar si el usuario acierta en el primer intento
        let intervalo;

        function empezarJuego() {
            tiempoInicio = Date.now();
            actualizarPalabras(); // Actualizar palabras desde el inicio
            intervalo = setInterval(actualizarTiempo, 1000);
            document.getElementById("entrada").disabled = false;
            document.getElementById("entrada").focus();
        }

        function actualizarTiempo() {
            tiempoEscrito = Math.floor((Date.now() - tiempoInicio) / 1000);
            document.getElementById("tiempo").innerText = `${tiempoEscrito}`;
        }

        function verificarEntrada() {
            let entradaUsuario = document.getElementById("entrada").value.trim();
            let palabraCorrecta = palabras[palabraActual];

            if (entradaUsuario === palabraCorrecta) {
                if (intentoActualCorrecto) {
                    aciertosPrimerIntento++;
                }
                palabraActual++;
                palabrasEscritas++;
                intentoActualCorrecto = true; // Reiniciar para la siguiente palabra
                document.getElementById("entrada").value = ''; // Limpiar el campo de texto

                if (palabraActual === palabras.length) {
                    clearInterval(intervalo);
                    window.location.href = `resultados.php?tiempo=${tiempoEscrito}&errores=${errores}&aciertos=${aciertosPrimerIntento}&totalPalabras=${palabras.length}&nivel_id=<?php echo $nivel_id; ?>`;
                    return;
                }

                actualizarPalabras();
            } else if (entradaUsuario.length >= palabraCorrecta.length || !palabraCorrecta.startsWith(entradaUsuario)) {
                // El usuario se ha equivocado
                errores++;
                intentoActualCorrecto = false; // Marcar que el primer intento fue incorrecto
            }
        }

        function actualizarPalabras() {
            let palabraAntes = palabraActual > 0 ? palabras[palabraActual - 1] : '';
            let palabraEscribiendo = palabras[palabraActual] || '';
            let palabraDespues = palabras[palabraActual + 1] || '';

            document.getElementById("palabraAntes").innerText = palabraAntes;
            document.getElementById("palabraEscribiendo").innerText = palabraEscribiendo;
            document.getElementById("palabraDespues").innerText = palabraDespues;

            document.getElementById("palabrasEscritas").innerText = `Palabras escritas: ${palabrasEscritas}`;
            document.getElementById("totalPalabras").innerText = `Total palabras: ${palabras.length}`;
        }
    </script>
</head>
<body onload="empezarJuego()">
    <header class="main-page-header">
        <h3>¡A JUGAR!</h3>
    </header>
    <div class="timer-grid">
        <div class="timer-label">Tiempo</div>
        <div class="timer-value">
            <div id="tiempo"> 0s</div>
    	</div>
    </div>
    
    <div class="text-display">
        <div class="typed-word"><span id="palabraAntes"></span></div>
        <div class="current-word"><span id="palabraEscribiendo" class="resaltar"></span></div>
        <div class="remaining-word"><span id="palabraDespues"></span></div>
    </div>
    
    <div class="input-container">
        <input type="text" id="entrada" oninput="verificarEntrada()" disabled placeholder="Escribe aquí la palabra...">
    </div>
    
    <div class="word-counter">
    	<div id="estadisticas">
	       <p id="palabrasEscritas">Palabras escritas: 0</p>
	       <p id="totalPalabras">Total palabras: 0</p>
        </div>
    </div>
   
    
</body>
</html>
