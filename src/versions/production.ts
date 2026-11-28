import type { Entry } from "../version";

/** Producción (rama `main`): del lanzamiento a hoy. La más nueva va al final. */
export const PRODUCTION: Entry[] = [
  { version: "0.1.0", date: "2026-11-24", es: "Lanzamiento: juego nuevo con escena 3D, frases completas, modos de juego, ranking y buzón de sugerencias.", en: "Launch: new game with a 3D scene, full-phrase typing, game modes, rankings and a suggestion box." },
  { version: "0.2.0", date: "2026-11-25", es: "Guía de dedos y teclado de colores con ayuda durante el juego.", en: "Finger guide and a colored keyboard to help while playing." },
  { version: "0.3.0", date: "2026-11-25", es: "Monedas, regalo del día y tienda de accesorios para Vectorcito.", en: "Coins, a daily gift and an accessory shop for Vectorcito." },
  { version: "0.4.0", date: "2026-11-25", es: "Retar a un amigo con un enlace.", en: "Challenge a friend with a link." },
  { version: "0.5.0", date: "2026-11-25", es: "Móvil y tablet, app instalable (PWA), icono y vista previa al compartir.", en: "Phone and tablet support, installable app (PWA), icon and share preview." },
  { version: "0.6.0", date: "2026-11-25", es: "Vectorcito en 3D con ambientes por dificultad, cosméticos nuevos, interfaz renovada, iconos propios y música generada.", en: "3D Vectorcito with environments per difficulty, new cosmetics, a refreshed interface, custom icons and generated music." },
  { version: "0.7.0", date: "2026-11-25", es: "Música por dificultad, reto diario animado con avisos en el celular y guía con teclado de colores.", en: "Music per difficulty, an animated daily challenge with phone reminders and a colored-keyboard guide." },
  { version: "0.7.1", date: "2026-11-25", es: "Arreglo: los resultados no se veían; música de inicio fuera de los niveles.", en: "Fix: results were invisible; menu music outside of levels." },
  { version: "0.8.0", date: "2026-11-27", es: "Combos por palabras limpias, monedas más fáciles, 15 cosméticos nuevos, estelas con partículas propias y modo desarrollador.", en: "Combos for clean words, easier coins, 15 new cosmetics, unique trail particles and a developer mode." },
  { version: "0.8.1", date: "2026-11-28", es: "Error más llamativo: viñeta roja, sacudida, onda, estrellas de mareo y glitch.", en: "A more dramatic mistake: red vignette, shake, shockwave, dizzy stars and glitch." },
  { version: "0.8.2", date: "2026-11-28", es: "El cartel de combo perdido sale con cualquier racha rota.", en: "The lost-combo sign shows for any broken streak." },
  { version: "0.8.3", date: "2026-11-28", es: "Número de versión en la pantalla de inicio, separado por entorno.", en: "Version number on the home screen, separate per environment." },
  { version: "0.8.4", date: "2026-11-28", es: "Interfaz más fluida (la tienda y las pestañas se actualizan sin redibujar la pantalla, animaciones suaves, resolución adaptable), tienda con la ficha del cosmético puesto aparte y lista con barra propia, y mapa de niveles y guía que caben en el celular.", en: "Smoother interface (the shop and tabs update without redrawing the screen, soft animations, adaptive resolution), a shop with its own card for the worn cosmetic and a game-colored scrollbar, and a level map and guide that fit on a phone." },
  { version: "0.8.5", date: "2026-11-28", es: "Ambientes: todos los menús usan el mapa del inicio y cada nivel su ambiente propio (ya no cambia al elegir dificultad en el mapa).", en: "Environments: every menu uses the home-screen environment and each level its own (it no longer changes when picking a difficulty on the map)." },
];
