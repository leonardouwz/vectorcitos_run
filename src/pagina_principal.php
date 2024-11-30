<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página Principal</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .exit-button {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            background-color: #ff4d4d;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <!-- Header Principal -->
    <header class="main-page-header">
        <h3>PÁGINA PRINCIPAL</h3>
        <a href="index.html" class="exit-button">Salir</a>
    </header>

    <!-- Contenedor Principal -->
    <main class="main-page-container">
        <!-- Botones de Dificultad -->
        <aside class="difficulty-list">
            <button class="difficulty-option active" data-difficulty="facil">Fácil</button>
            <button class="difficulty-option" data-difficulty="intermedio">Intermedio</button>
            <button class="difficulty-option" data-difficulty="dificil">Difícil</button>
        </aside>

        <!-- Cuadrícula de Niveles -->
        <section class="levels-display">
            <!-- Niveles para cada dificultad -->
            <div class="levels-grid active-levels" data-difficulty="facil">
                <?php
                $servername = "localhost";
                $username = "vectorcito";
                $password = "12345678";
                $dbname = "vectorcitos_run";

                $conn = new mysqli($servername, $username, $password, $dbname);
                if ($conn->connect_error) {
                    die("Conexión fallida: " . $conn->connect_error);
                }

                $dificultad = 'facil';
                $sql = "SELECT * FROM niveles WHERE dificultad = '$dificultad'";
                $result = $conn->query($sql);

                if ($result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        echo '<div class="level-square ' . ($row['desbloqueado'] ? 'unlocked' : 'locked') . '" data-id="' . $row['id'] . '" data-difficulty="' . $row['dificultad'] . '">';
                        echo '<a href="nivel_info.php?id=' . $row['id'] . '" class="level-button">';
                        echo '<span class="level-icon">' . ($row['desbloqueado'] ? '🎮' : '🚫') . '</span>';
                        echo '<p>Nivel ' . $row['id'] . '</p>';
                        echo '</a>';
                        echo '</div>';
                    }
                } else {
                    echo "No se encontraron niveles.";
                }
                $conn->close();
                ?>
            </div>

            <div class="levels-grid" data-difficulty="intermedio">
                <?php
                // Reutilizamos el mismo código para los niveles de dificultad intermedio
                $conn = new mysqli($servername, $username, $password, $dbname);
                $dificultad = 'intermedio';
                $sql = "SELECT * FROM niveles WHERE dificultad = '$dificultad'";
                $result = $conn->query($sql);

                if ($result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        echo '<div class="level-square ' . ($row['desbloqueado'] ? 'unlocked' : 'locked') . '" data-id="' . $row['id'] . '" data-difficulty="' . $row['dificultad'] . '">';
                        echo '<a href="nivel_info.php?id=' . $row['id'] . '" class="level-button">';
                        echo '<span class="level-icon">' . ($row['desbloqueado'] ? '🎮' : '🚫') . '</span>';
                        echo '<p>Nivel ' . $row['id'] . '</p>';
                        echo '</a>';
                        echo '</div>';
                    }
                }
                $conn->close();
                ?>
            </div>

            <div class="levels-grid" data-difficulty="dificil">
                <?php
                // Reutilizamos el mismo código para los niveles de dificultad difícil
                $conn = new mysqli($servername, $username, $password, $dbname);
                $dificultad = 'dificil';
                $sql = "SELECT * FROM niveles WHERE dificultad = '$dificultad'";
                $result = $conn->query($sql);

                if ($result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        echo '<div class="level-square ' . ($row['desbloqueado'] ? 'unlocked' : 'locked') . '" data-id="' . $row['id'] . '" data-difficulty="' . $row['dificultad'] . '">';
                        echo '<a href="nivel_info.php?id=' . $row['id'] . '" class="level-button">';
                        echo '<span class="level-icon">' . ($row['desbloqueado'] ? '🎮' : '🚫') . '</span>';
                        echo '<p>Nivel ' . $row['id'] . '</p>';
                        echo '</a>';
                        echo '</div>';
                    }
                }
                $conn->close();
                ?>
            </div>
        </section>
    </main>

    <script>
        document.querySelectorAll('.difficulty-option').forEach(button => {
            button.addEventListener('click', function () {
                // Eliminar la clase active de todos los botones y añadirla al seleccionado
                document.querySelectorAll('.difficulty-option').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Ocultar todos los niveles y mostrar solo los de la dificultad seleccionada
                const dificultadSeleccionada = this.getAttribute('data-difficulty');
                document.querySelectorAll('.levels-grid').forEach(grid => {
                    if (grid.getAttribute('data-difficulty') === dificultadSeleccionada) {
                        grid.classList.add('active-levels');
                    } else {
                        grid.classList.remove('active-levels');
                    }
                });
            });
        });
    </script>
</body>
</html>
