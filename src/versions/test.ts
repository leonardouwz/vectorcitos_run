import type { Entry } from "../version";

/** Pruebas estructuradas (rama `claude/zen-albattani-tmnejk`): lo que ya está listo para producción pero aún no se publica. Al hacer merge a `main`, pasa a production.ts. */
export const TEST: Entry[] = [
  { version: "0.8.1", date: "2026-11-28", es: "Error más llamativo: viñeta roja, sacudida, onda, estrellas de mareo y glitch.", en: "A more dramatic mistake: red vignette, shake, shockwave, dizzy stars and glitch." },
  { version: "0.8.2", date: "2026-11-28", es: "El cartel de combo perdido sale con cualquier racha rota.", en: "The lost-combo sign shows for any broken streak." },
  { version: "0.8.3", date: "2026-11-28", es: "Número de versión en la pantalla de inicio, separado por entorno.", en: "Version number on the home screen, separate per environment." },
];
