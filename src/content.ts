export type Lang = "es" | "en";
export type Diff = "easy" | "medium" | "hard";
export const DIFFS: Diff[] = ["easy", "medium", "hard"];

const T: Record<Diff, { es: string; en: string }[]> = {
  easy: [
    { es: "El sol brilla sobre el mar.", en: "The sun shines on the sea." },
    { es: "El cielo es azul.", en: "The sky is blue." },
    { es: "Las olas susurran secretos.", en: "The waves whisper secrets." },
    { es: "Las gaviotas vuelan en el cielo.", en: "Seagulls fly across the sky." },
    { es: "La luna brilla en la noche.", en: "The moon shines in the night." },
    { es: "Los árboles susurran con el viento.", en: "The trees whisper in the wind." },
  ],
  medium: [
    { es: "El viento sopla suavemente entre los árboles.", en: "The wind blows gently between the trees." },
    { es: "Las estrellas iluminan la noche oscura.", en: "The stars light up the dark night." },
    { es: "Los ríos fluyen con fuerza en primavera.", en: "Rivers flow with strength in spring." },
    { es: "La montaña se eleva majestuosamente.", en: "The mountain rises majestically." },
    { es: "Los océanos son vastos e impresionantes.", en: "The oceans are vast and impressive." },
    { es: "Un pequeño vector corre hacia el horizonte.", en: "A tiny vector runs toward the horizon." },
  ],
  hard: [
    { es: "La vida es un viaje lleno de sorpresas inesperadas.", en: "Life is a journey full of unexpected surprises." },
    { es: "El conocimiento es poder y la curiosidad es la clave.", en: "Knowledge is power and curiosity is the key." },
    { es: "Las experiencias nos moldean y nos definen.", en: "Our experiences shape us and define who we are." },
    { es: "El arte es la expresión más pura del alma humana.", en: "Art is the purest expression of the human soul." },
    { es: "La naturaleza nos ofrece belleza y serenidad.", en: "Nature offers us beauty and serenity." },
    { es: "Quien practica cada día llega más lejos que quien corre una sola vez.", en: "Whoever practices every day goes farther than whoever sprints once." },
  ],
};

export interface Level { id: number; diff: Diff; n: number; text: Record<Lang, string> }

/** Lista plana: el orden es el orden de desbloqueo. */
export const LEVELS: Level[] = DIFFS.flatMap((diff, d) =>
  T[diff].map((text, i) => ({ id: d * 10 + i + 1, diff, n: i + 1, text })),
);
