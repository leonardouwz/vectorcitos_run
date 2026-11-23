export type Lang = "es" | "en";
export type Diff = "easy" | "medium" | "hard" | "practice";
export const DIFFS: Diff[] = ["easy", "medium", "hard", "practice"];

type Text = { es: string; en: string };
// Importante: añade frases siempre AL FINAL de cada lista. El número de cada nivel
// (y el avance guardado de los jugadores) depende del orden.
const T: Record<"easy" | "medium" | "hard", Text[]> = {
  easy: [
    { es: "El sol brilla sobre el mar.", en: "The sun shines on the sea." },
    { es: "El cielo es azul.", en: "The sky is blue." },
    { es: "Las olas susurran secretos.", en: "The waves whisper secrets." },
    { es: "Las gaviotas vuelan en el cielo.", en: "Seagulls fly across the sky." },
    { es: "La luna brilla en la noche.", en: "The moon shines in the night." },
    { es: "Los árboles susurran con el viento.", en: "The trees whisper in the wind." },
    { es: "La brisa huele a mar.", en: "The breeze smells like the sea." },
    { es: "Un pez salta en el agua.", en: "A fish jumps out of the water." },
    { es: "Mi gato duerme al sol.", en: "My cat sleeps in the sun." },
    { es: "Hoy es un buen día.", en: "Today is a good day." },
  ],
  medium: [
    { es: "El viento sopla suavemente entre los árboles.", en: "The wind blows gently between the trees." },
    { es: "Las estrellas iluminan la noche oscura.", en: "The stars light up the dark night." },
    { es: "Los ríos fluyen con fuerza en primavera.", en: "Rivers flow with strength in spring." },
    { es: "La montaña se eleva majestuosamente.", en: "The mountain rises majestically." },
    { es: "Los océanos son vastos e impresionantes.", en: "The oceans are vast and impressive." },
    { es: "Un pequeño vector corre hacia el horizonte.", en: "A tiny vector runs toward the horizon." },
    { es: "Las nubes viajan despacio sobre la ciudad.", en: "The clouds travel slowly over the city." },
    { es: "Escribir cada día hace más rápidos tus dedos.", en: "Typing every day makes your fingers faster." },
    { es: "El faro guía a los barcos en la oscuridad.", en: "The lighthouse guides the ships in the dark." },
    { es: "¿Cuántas estrellas puedes ganar hoy?", en: "How many stars can you earn today?" },
  ],
  hard: [
    { es: "La vida es un viaje lleno de sorpresas inesperadas.", en: "Life is a journey full of unexpected surprises." },
    { es: "El conocimiento es poder y la curiosidad es la clave.", en: "Knowledge is power and curiosity is the key." },
    { es: "Las experiencias nos moldean y nos definen.", en: "Our experiences shape us and define who we are." },
    { es: "El arte es la expresión más pura del alma humana.", en: "Art is the purest expression of the human soul." },
    { es: "La naturaleza nos ofrece belleza y serenidad.", en: "Nature offers us beauty and serenity." },
    { es: "Quien practica cada día llega más lejos que quien corre una sola vez.", en: "Whoever practices every day goes farther than whoever sprints once." },
    { es: "Después de la tormenta, el cielo se llena de colores y la calma regresa al valle.", en: "After the storm, the sky fills with color and calm returns to the valley." },
    { es: "Cada error es una lección: aprende de él, respira y vuelve a intentarlo con más fuerza.", en: "Every mistake is a lesson: learn from it, breathe, and try again with more strength." },
    { es: "La biblioteca guardaba mapas antiguos, relojes rotos y cartas que nadie se atrevió a abrir.", en: "The library kept old maps, broken clocks and letters that nobody dared to open." },
    { es: "Entre teclas y pantallas, el pequeño vector aprendió que la velocidad nace de la precisión.", en: "Between keys and screens, the tiny vector learned that speed is born from precision." },
  ],
};

// Práctica libre: ejercicios de teclas, siempre abiertos y fuera de la progresión.
const DRILLS: { title: Text; text: Text }[] = [
  { title: { es: "Fila central", en: "Home row" }, text: { es: "asdf jklñ fdsa ñlkj dad sal fas lado", en: "asdf jkl; fdsa ;lkj dad sad fall lads" } },
  { title: { es: "Fila superior", en: "Top row" }, text: { es: "qwer tyui op wert quito pero tipo", en: "qwer tyui op wert quit pure type" } },
  { title: { es: "Fila inferior", en: "Bottom row" }, text: { es: "zxcv bnm, zona vino bomba mixto cabe", en: "zxcv bnm, zone vine bomb next calm" } },
  { title: { es: "Números", en: "Numbers" }, text: { es: "1234 5678 90 2026 365 12:30 3,14 100", en: "1234 5678 90 2026 365 12:30 3.14 100" } },
  { title: { es: "Símbolos", en: "Symbols" }, text: { es: "@ # $ % & * ( ) - _ = + ! ? ;", en: "@ # $ % & * ( ) - _ = + ! ? ;" } },
  { title: { es: "Acentos y ñ", en: "Punctuation" }, text: { es: "á é í ó ú ü ñ ¿Qué? ¡Hola! Año, niño, canción.", en: "it's don't we'll \"yes\" (maybe) well-known, ok." } },
];

export interface Level { id: number; diff: Diff; n: number; text: Record<Lang, string>; title?: Record<Lang, string>; free: boolean }

/** Progresión (fácil → medio → difícil): el orden es el orden de desbloqueo. Después, la práctica libre. */
export const LEVELS: Level[] = [
  ...(["easy", "medium", "hard"] as const).flatMap((diff, d) =>
    T[diff].map((text, i): Level => ({ id: d * 10 + i + 1, diff, n: i + 1, text, free: false }))),
  ...DRILLS.map((x, i): Level => ({ id: 101 + i, diff: "practice", n: i + 1, text: x.text, title: x.title, free: true })),
];
