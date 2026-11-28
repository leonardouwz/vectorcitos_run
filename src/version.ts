// Versión del juego (formato v0.0.0): 1.º = temporada o cambio realmente grande, 2.º = mecánicas y novedades, 3.º = arreglos y cambios pequeños.
// Cada entorno cuenta aparte: producción (`main`), pruebas estructuradas y conceptos. La lista de cambios de cada uno vive en src/versions/.
import { CONCEPT } from "./versions/concept";
import { V1 } from "./versions/v1";
import { PRODUCTION } from "./versions/production";
import { TEST } from "./versions/test";

export interface Entry { version: string; date: string; es: string; en: string }
export type Channel = "production" | "test" | "concept" | "v1" | "dev";

declare const __CHANNEL__: string;
export const channel: Channel = (typeof __CHANNEL__ !== "undefined" ? __CHANNEL__ : "dev") as Channel;

const LISTS: Record<Channel, Entry[]> = { production: PRODUCTION, test: TEST, concept: CONCEPT, v1: V1, dev: TEST };
/** Cambios de este entorno, del más viejo al más nuevo (los de pruebas y conceptos se añaden a los de producción). */
export const entries: Entry[] = channel === "production" ? PRODUCTION : [...PRODUCTION, ...LISTS[channel]];
export const current = entries[entries.length - 1];
export const LABEL: Record<Channel, string> = { production: "", test: "pruebas", concept: "conceptos", v1: "diseño v1", dev: "dev" };
/** Lo que se ve en pantalla: `v0.8.0` en producción; `v0.8.3 · pruebas` en los demás. */
export const versionText = `v${current.version}${LABEL[channel] ? ` · ${LABEL[channel]}` : ""}`;
