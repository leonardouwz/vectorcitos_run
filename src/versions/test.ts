import type { Entry } from "../version";

/** Pruebas estructuradas (rama `claude/zen-albattani-tmnejk`): lo que ya está listo para producción pero aún no se publica. Al hacer merge a `main`, pasa a production.ts (así quedó tras la v0.8.3). */
export const TEST: Entry[] = [
  { version: "0.8.4", date: "2026-11-28", es: "Interfaz más fluida: la tienda y las pestañas se actualizan sin redibujar toda la pantalla, animaciones suaves, resolución adaptable y tienda mejor repartida en celular y tablet.", en: "Smoother interface: the shop and tabs update without redrawing the whole screen, soft animations, adaptive resolution and a better-laid-out shop on phone and tablet." },
  { version: "0.8.5", date: "2026-11-28", es: "Sin deslizadores: la tienda reparte las tarjetas en páginas con la ficha del cosmético fija aparte; el mapa de niveles y la guía caben en la pantalla del celular.", en: "No scrolling: the shop splits cards into pages with the selected cosmetic fixed apart; the level map and the guide fit on a phone screen." },
];
