"use strict";

const readline = require('readline');
const axios = require('axios');  // Asegúrate de instalar axios: npm install axios

const MAX_LOGIN_ATTEMPTS = 3;
const MIN_PASSWORD_LENGTH = 6;

class User {
    constructor(id, username, unlockedLevels) {
        this.id = id;
        this.username = username;
        this.loginAttempts = 0;
        this.unlockedLevels = {
            easy: 0,
            medium: 0,
            hard: 0
        };
        
        // Inicializar los niveles desbloqueados desde los datos del servidor
        this.parseUnlockedLevels(unlockedLevels);
    }

    parseUnlockedLevels(serverUnlockedLevels) {
        // Convertir el número de niveles desbloqueados del servidor en un objeto
        const total = serverUnlockedLevels || 0;
        
        // Descomponer el número total
        this.unlockedLevels.easy = Math.floor(total / 100);
        this.unlockedLevels.medium = Math.floor((total % 100) / 10);
        this.unlockedLevels.hard = total % 10;
        
        // Asegurar que easy siempre tenga al menos 1
        if (this.unlockedLevels.easy === 0) this.unlockedLevels.easy = 1;
    }

    getTotalUnlockedLevels() {
        return Object.values(this.unlockedLevels).reduce((sum, current) => sum + current, 0);
    }
}

const texts = {
    easy: ["El sol brilla intensamente sobre el mar."],
    medium: ["El viento sopla suavemente entre los árboles."],
    hard: ["La vida es un viaje lleno de sorpresas inesperadas."]
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}

async function serverRequest(endpoint, data) {
    try {
        // Cambiar la URL al archivo PHP correcto
        const response = await axios.post('http://127.0.0.1/vectorcitos/src/db_connect.php', {
            ...data,  // Spread de los datos
            action: endpoint
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error en la solicitud al servidor:', 
            error.response ? error.response.data : error.message
        );
        return null;
    }
}

async function registerUser() {
    try {
        const username = await pregunta("Introduce tu nombre de usuario: ");
        const password = await pregunta("Introduce tu contraseña: ");
        
        if (username.length < 3) {
            console.log("Nombre de usuario demasiado corto");
            return;
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            console.log("Contraseña demasiado corta");
            return;
        }

        const result = await serverRequest('register', { username, password });
        
        if (result && result.success) {
            console.log('Usuario registrado con éxito');
            console.log('ID de usuario:', result.userId);
        } else {
            console.log(result.message || 'Error al registrar usuario');
        }
    } catch (err) {
        console.error('Error al registrar usuario:', err);
    }
}

async function loginUser() {
    try {
        const username = await pregunta("Introduce tu nombre de usuario: ");
        const password = await pregunta("Introduce tu contraseña: ");

        const result = await serverRequest('login', { username, password });
        
        if (result && result.success) {
            console.log("Inicio de sesión exitoso");
            const user = new User(
                result.user.ID_User, 
                result.user.username, 
                result.user.unlockedLevels
            );
            await mainGameMenu(user);
        } else {
            console.log(result.message || "Error en el inicio de sesión");
        }
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
    }
}

async function updateUnlockedLevels(user) {
    try {
        const totalUnlockedLevels = calculateUnlockedLevelsNumber(user.unlockedLevels);
        const result = await serverRequest('update_levels', { 
            userId: user.id, 
            totalUnlockedLevels: totalUnlockedLevels 
        });
        
        if (!result || !result.success) {
            console.error('No se pudieron actualizar los niveles');
        }
    } catch (err) {
        console.error('Error al actualizar niveles:', err);
    }
}

function calculateUnlockedLevelsNumber(unlockedLevels) {
    return (unlockedLevels.easy) + (unlockedLevels.medium) + unlockedLevels.hard;
}

async function mainGameMenu(user) {
    while (true) {
        console.log("\n=== Menú del juego ===");
        console.log("1. Fácil");
        console.log("2. Medio");
        console.log("3. Difícil");
        console.log("4. Ver niveles desbloqueados");
        console.log("5. Salir");
        
        const choice = await pregunta("Selecciona una opción: ");
        switch(choice) {
            case '1':
                await selectLevel(user, 'easy');
                break;
            case '2':
                await selectLevel(user, 'medium');
                break;
            case '3':
                await selectLevel(user, 'hard');
                break;
            case '4':
                showUnlockedLevels(user);
                break;
            case '5':
                return;
            default:
                console.log("Opción no válida");
        }
    }
}

async function selectLevel(user, difficulty) {
    const maxLevel = user.unlockedLevels[difficulty];
    const availableLevels = texts[difficulty].length;
    
    console.log(`\nNiveles disponibles: 1 hasta ${Math.min(maxLevel + 1, availableLevels)}`);
    const level = parseInt(await pregunta(`Selecciona un nivel: `));

    if (isNaN(level) || level < 1 || level > maxLevel + 1 || level > availableLevels) {
        console.log("Nivel no válido");
        return;
    }

    console.log(`Has seleccionado el nivel ${level}`);
    await startGame(difficulty, level, user);
}

async function startGame(difficulty, level, user) {
    const text = texts[difficulty][level - 1];
    if (!text) {
        console.log("Error: Texto no encontrado para este nivel");
        return;
    }

    const words = text.split(" ");
    const startTime = Date.now();
    await playGame(words, 0, user, difficulty, level, startTime);
}

function levelCompleteMessage(difficulty, level) {
    console.log(`¡Felicidades! Has completado el nivel ${level} en la dificultad "${difficulty}".`);
}

function showUnlockedLevels(user) {
    console.log("\n=== Niveles desbloqueados ===");
    for (const difficulty in user.unlockedLevels) {
        console.log(`Dificultad ${difficulty}: Nivel ${user.unlockedLevels[difficulty]}`);
    }
    console.log(`Total de niveles desbloqueados: ${user.getTotalUnlockedLevels()}`);
}

function calculateScore(startTime, endTime, wordCount) {
    const timeTaken = (endTime - startTime) / 1000;
    const wordsPerMinute = (wordCount / timeTaken) * 60;
    console.log(`Puntuación: ${Math.round(wordsPerMinute)} palabras por minuto`);
    return wordsPerMinute;
}

async function unlockNextLevel(user, difficulty) {
    if (user.unlockedLevels[difficulty] < texts[difficulty].length) {
        user.unlockedLevels[difficulty]++;
        const totalLevels = user.getTotalUnlockedLevels();
        console.log(`Nuevo nivel desbloqueado en dificultad "${difficulty}".`);
        console.log(`Total de niveles desbloqueados: ${totalLevels}`);
        await updateUnlockedLevels(user);
    } else {
        console.log(`Has completado todos los niveles de "${difficulty}".`);
    }
}

async function retryLevel(user, difficulty, level) {
    const retry = await pregunta("¿Quieres intentar de nuevo? (si/no): ");
    if (retry.toLowerCase() === "si") {
        await startGame(difficulty, level, user);
    } else {
        console.log("Volviendo al menú principal");
    }
}

async function playGame(words, currentWordIndex, user, difficulty, level, startTime, correctCount = 0, errorCount = 0) {
    if (currentWordIndex < words.length) {
        const targetWord = words[currentWordIndex];
        const userInput = await pregunta(`Escribe: "${targetWord}"\n`);
        
        if (userInput === targetWord) {
            console.log("¡Correcto!");
            await playGame(words, currentWordIndex + 1, user, difficulty, level, startTime, correctCount + 1, errorCount);
        } else {
            console.log("Incorrecto. La palabra correcta era: " + targetWord);
            await playGame(words, currentWordIndex + 1, user, difficulty, level, startTime, correctCount, errorCount + 1);
        }
    } else {
        const endTime = Date.now();
        const score = calculateScore(startTime, endTime, words.length);
        levelCompleteMessage(difficulty, level);
        await unlockNextLevel(user, difficulty);
        await retryLevel(user, difficulty, level);
    }
}

async function mainMenu() {
    while (true) {
        console.log("\n=== Sistema de Login ===");
        console.log("1. Iniciar sesión");
        console.log("2. Registrarse");
        console.log("3. Salir");

        const option = await pregunta("Selecciona una opción: ");
        
        switch (option) {
            case '1':
                await loginUser();
                break;
            case '2':
                await registerUser();
                break;
            case '3':
                console.log("¡Hasta pronto!");
                rl.close();
                return;
            default:
                console.log("Opción no válida");
        }
    }
}

console.log("Bienvenido al Sistema de Login y Juego de Mecanografía");
mainMenu().catch(console.error);
