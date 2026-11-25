// Iconos del juego. Los dibujos viven en icon-data.ts (generado) y se cargan aparte para no frenar el arranque:
// main.ts espera a loadIcons() antes de mostrar la primera pantalla.
import type { IconName } from "./icon-data";
export type { IconName };

let BODY: Record<string, string> = {};

export async function loadIcons() {
  BODY = (await import("./icon-data")).BODY;
}

/** Icono en SVG para insertar en el HTML. Es decorativo: el texto que lo acompaña dice lo mismo. */
export const ic = (name: IconName) =>
  `<svg class="ic" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${BODY[name] ?? ""}</svg>`;
