import type { Entry } from "../version";

/** Pruebas estructuradas (rama `claude/zen-albattani-tmnejk`): lo que ya está listo para producción pero aún no se publica. Al hacer merge a `main`, pasa a production.ts (así quedó tras la v0.8.3). */
export const TEST: Entry[] = [
  { version: "0.8.5", date: "2026-11-28", es: "Ambientes: todos los menús usan el mapa del inicio y cada nivel su ambiente propio (ya no cambia al elegir dificultad en el mapa).", en: "Environments: every menu uses the home-screen environment and each level its own (it no longer changes when picking a difficulty on the map)." },
];
