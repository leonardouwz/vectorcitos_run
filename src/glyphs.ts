// Iconos de interfaz (navegación, ajustes, estados): una sola familia de trazo para toda la UI.
// Las pegatinas 3D de public/icons son para los objetos del juego; esto es lo que se usa para controlar.
const base = (d: string, extra = "") => `<svg class="gl" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;

const PATHS = {
  play: '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z"/>',
  daily: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M12 18.2c-1.6 0-2.7-1-2.7-2.4 0-1.6 1.7-2.4 2-4 .9.8 3.4 2.3 3.4 4 0 1.4-1.1 2.4-2.7 2.4z"/>',
  shop: '<path d="M5.5 8h13l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.1a1.6 1.6 0 0 1-1.6-1.4L5.5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  more: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.6 9.6c.6-.8 1.5-1.1 2.4-1.1 1.4 0 2.4.7 2.4 1.7 0 2.2-4.8 1.2-4.8 3.6 0 1 1 1.7 2.4 1.7.9 0 1.8-.3 2.4-1.1"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 3.4-5 4.2-8.4 2.6 1.6 7.8 4.6 7.8 8.8 0 3.2-2.4 5.2-6 5.2z"/><path d="M12 21c-1.6 0-2.6-1-2.6-2.4 0-1.4 1.2-2 1.6-3.2 1.2.8 3.6 1.6 3.6 3.2 0 1.4-1 2.4-2.6 2.4z"/>',
  star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.8l5.9-.8L12 3.6z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3M12 13v4M8.5 20h7M10 17h4"/>',
  hands: '<path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v4.5c0 4-2.6 7-6.5 7S6.5 18 5 15.5l-1.4-2.6a1.5 1.5 0 0 1 2.6-1.5L7 12.6"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4 8 8 5.5L20 8"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"/>',
  music: '<path d="M9 18V6.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-1.2-3.8-5-4.4-5-2s3 2 5 2c2 0 5 .4 5-2s-3.800-1.800-5 2z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  head: '<path d="M4 17c0-4 3.4-8 8-8s8 4 8 8H4z"/><path d="M12 9V5"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M9 10.5h.01M15 10.5h.01M9 15c1.8 1.4 4.2 1.4 6 0"/>',
  body: '<path d="M8 5h8l3 4-2.6 1.4V20H7.6v-9.6L5 9l3-4z"/>',
  color: '<path d="M12 3.5c4 4.6 6 7.4 6 10a6 6 0 0 1-12 0c0-2.6 2-5.4 6-10z"/>',
  trail: '<path d="M3 17c4-1 5-6 9-6s4 3 9 2M3 12c3-.5 4-3.500 7-3.500"/><circle cx="19" cy="8" r="1.4"/>',
} as const;

export type Glyph = keyof typeof PATHS;
export const gl = (name: Glyph, cls = "") => (cls ? base(PATHS[name]).replace('class="gl"', `class="gl ${cls}"`) : base(PATHS[name]));
