// Genera src/icons.ts con los emojis que usa el juego, del paquete Fluent Emoji (Microsoft, licencia MIT).
// Uso: node scripts/make-icons.mjs
// Para cambiar de paquete o poner iconos propios: edita NAMES (o reemplaza el SVG de una entrada en src/icons.ts).
import { readFileSync, writeFileSync } from "node:fs";

const SET = "node_modules/@iconify-json/fluent-emoji/icons.json";
const NAMES = {
  game: "video-game", locked: "prohibited", daily: "calendar", fire: "fire", time: "stopwatch", progress: "chart-increasing",
  rank: "trophy", world: "globe-showing-americas", room: "school", box: "love-letter", hands: "hand-with-fingers-splayed",
  kbd: "keyboard", shop: "shopping-bags", gift: "wrapped-gift", coin: "coin", challenge: "handshake", win: "party-popper",
  party: "partying-face", tophat: "top-hat", crown: "crown", glasses: "glasses", shades: "smiling-face-with-sunglasses",
  bow: "ribbon", cape: "person-superhero", sound: "speaker-high-volume", mute: "muted-speaker", phone: "mobile-phone",
};

const set = JSON.parse(readFileSync(SET, "utf8"));
const out = {};
for (const [name, icon] of Object.entries(NAMES)) {
  const i = set.icons[icon];
  if (!i) throw new Error(`No existe "${icon}" en el paquete`);
  // los ids de los degradados se prefijan para que dos iconos distintos no se pisen
  const ids = [...i.body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  let body = i.body;
  for (const id of ids) body = body.replaceAll(`id="${id}"`, `id="${name}-${id}"`).replaceAll(`url(#${id})`, `url(#${name}-${id})`).replaceAll(`href="#${id}"`, `href="#${name}-${id}"`);
  // a 48 px sobra precisión: recortar decimales reduce el peso a casi la mitad
  out[name] = body.replace(/(\d+\.\d)\d+/g, "$1");
}
const ts = `// Generado por scripts/make-icons.mjs a partir de Fluent Emoji (Microsoft, MIT). No editar a mano: cambia el script.
const BODY: Record<string, string> = ${JSON.stringify(out, null, 1)};

export type IconName = ${Object.keys(NAMES).map((n) => `"${n}"`).join(" | ")};

/** Icono en SVG para insertar en el HTML. Es decorativo: el texto que lo acompaña dice lo mismo. */
export const ic = (name: IconName) =>
  \`<svg class="ic" viewBox="0 0 32 32" aria-hidden="true" focusable="false">\${BODY[name]}</svg>\`;
`;
writeFileSync("src/icons.ts", ts);
console.log(`src/icons.ts: ${Object.keys(out).length} iconos, ${(ts.length / 1024).toFixed(1)} kB`);
