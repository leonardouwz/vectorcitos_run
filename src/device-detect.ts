// Funciones puras de detección (sin tocar el navegador) para poder probarlas.
export type Kind = "phone" | "tablet" | "desktop";
export type OS = "ios" | "android" | "windows" | "mac" | "linux" | "other";

export function detectOS(ua: string, platform: string, touchPoints: number): OS {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mac/i.test(platform || ua)) return touchPoints > 1 ? "ios" : "mac"; // iPadOS se presenta como Mac, pero con pantalla táctil
  if (/Win/i.test(platform || ua)) return "windows";
  if (/Linux|CrOS/i.test(platform || ua)) return "linux";
  return "other";
}

/** Teléfono o tablet según el lado corto de la pantalla (no cambia al girarla). */
export const kindFor = (touch: boolean, shortSide: number): Kind => (!touch ? "desktop" : shortSide < 600 ? "phone" : "tablet");
