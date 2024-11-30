// scripts/registro.js

// Función para registrar al usuario
function registerUser() {
    // Obtener los valores de los campos de entrada
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const errorMessage = document.getElementById("register-error");

    // Limpiar el mensaje de error
    errorMessage.textContent = "";

    // Validar que ambos campos no estén vacíos
    if (!username || !password) {
        errorMessage.textContent = "Por favor, completa todos los campos.";
        return;
    }

    // Verificar si el nombre de usuario ya está registrado en localStorage
    if (localStorage.getItem(username)) {
        errorMessage.textContent = "El nombre de usuario ya está registrado. Elige otro.";
        return;
    }

    // Guardar los datos del usuario en localStorage
    const userData = {
        username: username,
        password: password // Nota: No es seguro almacenar contraseñas directamente en localStorage
    };

    localStorage.setItem(username, JSON.stringify(userData));

    // Mostrar mensaje de éxito y redirigir a la página de inicio de sesión
    alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
    window.location.href = "../index.html";
}
