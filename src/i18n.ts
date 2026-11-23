import type { Lang } from "./content";

const D = {
  es: {
    tagline: "Conviértete en un maestro del teclado en solo unos minutos al día.",
    play: "Jugar", back: "Volver", exit: "Salir", next: "Siguiente nivel", retry: "Reintentar", map: "Mapa",
    who: "¿Quién juega?", name: "Tu nombre", start: "Empezar", resume: "Continuar como",
    nameHint: "Tu avance se guarda en este dispositivo.",
    pick: "Elige un nivel", level: "Nivel", locked: "Bloqueado", open: "Desbloqueado",
    easy: "Fácil", medium: "Intermedio", hard: "Difícil", practice: "Práctica",
    best: "Mejor marca", none: "Sin jugar", time: "Tiempo",
    typeHint: "Escribe la frase", tapHint: "Toca para escribir", written: "Letras", streak: "Racha",
    results: "Resultados", words: "Palabras", errors: "Errores", acc: "Precisión", wpm: "Palabras por minuto",
    unlocked: "¡Nivel desbloqueado!", allDone: "¡Completaste todos los niveles!",
    newBest: "¡Nueva mejor marca!", sound: "Sonido", lang: "Idioma",
    wpmShort: "ppm", progress: "Mi progreso", runs: "Partidas", avgWpm: "ppm promedio", bestWpm: "Mejor ppm", avgAcc: "Precisión media", totalStars: "Estrellas",
    wpmChart: "Palabras por minuto", accChart: "Precisión (%)", recent: "Últimas partidas", noRuns: "Aún no hay partidas. ¡Juega un nivel!",
    toPractice: "Palabras para practicar", cleanRun: "¡Sin fallos!", vsBest: "frente a tu mejor marca", sameBest: "Igualaste tu mejor marca", lastN: "últimas",
    hardKeys: "Letras que más fallas",
    msg1: "Casi. Intenta de nuevo.", msg2: "¡Muy bien!", msg3: "¡Perfecto!",
  },
  en: {
    tagline: "Become a keyboard master in just a few minutes a day.",
    play: "Play", back: "Back", exit: "Exit", next: "Next level", retry: "Retry", map: "Map",
    who: "Who is playing?", name: "Your name", start: "Start", resume: "Continue as",
    nameHint: "Your progress is saved on this device.",
    pick: "Choose a level", level: "Level", locked: "Locked", open: "Unlocked",
    easy: "Easy", medium: "Medium", hard: "Hard", practice: "Drills",
    best: "Best run", none: "Not played", time: "Time",
    typeHint: "Type the phrase", tapHint: "Tap to type", written: "Letters", streak: "Streak",
    results: "Results", words: "Words", errors: "Errors", acc: "Accuracy", wpm: "Words per minute",
    unlocked: "Level unlocked!", allDone: "You completed every level!",
    newBest: "New best run!", sound: "Sound", lang: "Language",
    wpmShort: "wpm", progress: "My progress", runs: "Runs", avgWpm: "Average wpm", bestWpm: "Best wpm", avgAcc: "Average accuracy", totalStars: "Stars",
    wpmChart: "Words per minute", accChart: "Accuracy (%)", recent: "Recent runs", noRuns: "No runs yet. Play a level!",
    toPractice: "Words to practice", cleanRun: "No mistakes!", vsBest: "vs your best run", sameBest: "You matched your best run", lastN: "last",
    hardKeys: "Keys you miss most",
    msg1: "Almost. Try again.", msg2: "Nice work!", msg3: "Perfect!",
  },
} as const;

export type Key = keyof (typeof D)["es"];
export const t = (lang: Lang, k: Key) => D[lang][k];
export const detectLang = (): Lang => (navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");
