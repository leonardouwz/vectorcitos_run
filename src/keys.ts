import type { Lang } from "./content";

/** Dedos: 0-3 mano izquierda (meñique → índice), 4-7 mano derecha (índice → meñique), 8 pulgares. */
export const FINGER_COLORS = ["#ff7070", "#ffa94d", "#ffea85", "#a3ffa3", "#6ab7ff", "#b69cff", "#ff8ad6", "#5fe0d0", "#eaeaea"];
export const FINGER_NAMES: Record<Lang, string[]> = {
  es: ["Meñique izquierdo", "Anular izquierdo", "Medio izquierdo", "Índice izquierdo", "Índice derecho", "Medio derecho", "Anular derecho", "Meñique derecho", "Pulgares"],
  en: ["Left pinky", "Left ring", "Left middle", "Left index", "Right index", "Right middle", "Right ring", "Right pinky", "Thumbs"],
};
const COL_FINGER = [0, 1, 2, 3, 3, 4, 4, 5, 6, 7];

export const rows = (lang: Lang) => ["1234567890", "qwertyuiop", lang === "es" ? "asdfghjklñ" : "asdfghjkl;", lang === "es" ? "zxcvbnm,.-" : "zxcvbnm,./"];

export type Loc = { key: string; finger: number; shift?: "sl" | "sr" };

// Símbolos con Mayús sobre la fila de números, según la distribución (aproximada).
const SHIFT_DIGITS: Record<Lang, string> = { en: "!@#$%^&*()", es: '!"·$%&/()=' };

/** Dónde está una letra: tecla, dedo y si necesita Mayús. Devuelve null si no se sabe (no se resalta nada). */
export function locate(ch: string, lang: Lang): Loc | null {
  if (ch === " ") return { key: "sp", finger: 8 };
  const R = rows(lang);
  const find = (c: string, shift?: boolean): Loc | null => {
    for (let r = 0; r < R.length; r++) {
      const col = R[r].indexOf(c);
      if (col >= 0) {
        const finger = COL_FINGER[col];
        return { key: `${r}-${col}`, finger, ...(shift ? { shift: finger <= 3 ? ("sr" as const) : ("sl" as const) } : {}) };
      }
    }
    return null;
  };
  const lower = ch.toLowerCase();
  if (lower !== ch && /\p{L}/u.test(ch)) return find(lower.normalize("NFD").replace(/[̀-ͯ]/g, "") === lower ? lower : lower, true) ?? find(stripAccent(lower), true);
  const base = stripAccent(lower);
  const direct = find(base);
  if (direct) return direct;
  const si = SHIFT_DIGITS[lang].indexOf(ch);
  return si >= 0 ? find(R[0][si], true) : null;
}

const stripAccent = (c: string) => (c === "ñ" ? c : c.normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** Qué teclas toca cada dedo (según la distribución del idioma), para la guía de dedos. */
export function fingerKeys(lang: Lang): string[][] {
  const out: string[][] = Array.from({ length: 9 }, () => []);
  rows(lang).forEach((row) => [...row].forEach((c, col) => out[COL_FINGER[col]].push(c.toUpperCase())));
  out[8].push("␣");
  return out;
}

/** Teclado dibujado con HTML: cada tecla lleva el color de su dedo. */
export function keyboardHtml(lang: Lang) {
  const R = rows(lang);
  const key = (id: string, label: string, finger: number, extra = "") =>
    `<span class="k ${extra}" data-k="${id}" style="--f:${FINGER_COLORS[finger]}">${label}</span>`;
  const line = (r: number) =>
    [...R[r]].map((c, col) => key(`${r}-${col}`, c.toUpperCase(), COL_FINGER[col], r === 2 && (col === 3 || col === 6) ? "home" : "")).join("");
  return `<div class="kbd" aria-hidden="true">
    <div class="kr">${line(0)}</div>
    <div class="kr" style="margin-left:.9em">${line(1)}</div>
    <div class="kr" style="margin-left:1.6em">${line(2)}</div>
    <div class="kr" style="margin-left:.4em">${key("sl", "⇧", 0, "wide")}${line(3)}${key("sr", "⇧", 7, "wide")}</div>
    <div class="kr">${key("sp", "", 8, "space")}</div>
  </div>`;
}

/** Resalta la próxima tecla (y Mayús si hace falta). */
export function highlightKey(root: ParentNode, ch: string, lang: Lang) {
  root.querySelectorAll(".k.next").forEach((k) => k.classList.remove("next"));
  const loc = locate(ch, lang);
  if (!loc) return;
  root.querySelector(`[data-k="${loc.key}"]`)?.classList.add("next");
  if (loc.shift) root.querySelector(`[data-k="${loc.shift}"]`)?.classList.add("next");
}
