<?php
// Verificar si se ha pasado un ID por URL
if (isset($_GET['id'])) {
    $nivel_id = $_GET['id'];

    // Conexión con la base de datos
    $servername = "localhost";
    $username = "vectorcito";
    $password = "12345678";
    $dbname = "vectorcitos_run"; // Nombre de tu base de datos

    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        die("Conexión fallida: " . $conn->connect_error);
    }

    // Obtener los detalles del nivel según el ID
    $sql = "SELECT * FROM niveles WHERE id = '$nivel_id'";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $nivel = $result->fetch_assoc();
    } else {
        echo "Nivel no encontrado.";
        exit;
    }

    $conn->close();
} else {
    echo "ID de nivel no proporcionado.";
    exit;
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Información del Nivel</title>
    <link rel="stylesheet" href="../styles/styles.css">
</head>
<body>
    <header class="main-page-header">
        <h3>INFORMACIÓN DEL NIVEL  <?php echo $nivel['id']; ?></h3>
    </header>
    
    <main class="level-main">
    	<div class="text-container">
    		<p><?php echo $nivel['descripcion']; ?></p>
	</div>

    <div class="level-stats">
        <p><strong>Dificultad:</strong> <?php echo ucfirst($nivel['dificultad']); ?></p>
        <p><strong>Estado:</strong> <?php echo ($nivel['desbloqueado'] ? 'Desbloqueado' : 'Bloqueado'); ?></p>
        
        
        <div class="button-group">
        	<a href="pagina_principal.php?id=<?php echo $nivel['id']; ?>" class="button back-button">Volver</a>
		<a href="jugar.php?id=<?php echo $nivel['id']; ?>" class="button play-button">Jugar</a>
	</div>
    </main>
</body>
</html>
