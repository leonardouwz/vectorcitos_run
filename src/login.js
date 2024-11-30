document.addEventListener("DOMContentLoaded", () => {
    // Get the login button
    loginButton = document.getElementById("login-button");
    
    // Función para iniciar sesión
    function loginUser(event) {
        // Prevent the form from submitting normally
        event.preventDefault();

        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value.trim();
        const errorMessage = document.querySelector(".error-message");

        // Limpiar el mensaje de error
        errorMessage.textContent = "";

        if (!username || !password) {
            errorMessage.textContent = "Por favor, completa todos los campos.";
            return;
        }

        const storedUser = localStorage.getItem(username);

        if (!storedUser) {
            errorMessage.textContent = "El usuario no existe. Por favor, regístrate.";
            return;
        }

        const userData = JSON.parse(storedUser);
        if (userData.password !== password) {
            errorMessage.textContent = "La contraseña es incorrecta.";
            return;
        }

        alert("¡Inicio de sesión exitoso!");
        window.location.href = "pagina_principal.php";
    }

    // Add event listener to the login button
    loginButton = document.getElementById("login-button");
    loginButton.addEventListener("click", loginUser);
});
