// Genera los iconos y la imagen para compartir (public/*.png, public/favicon.*) a partir del dibujo de Vectorcito.
// Uso (necesita Playwright instalado): node scripts/make-assets.mjs
// Es un icono provisional: para cambiarlo, edita ROBOT (o reemplaza este script por tus propios archivos en public/).
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const NAVY = "#050429", NEON = "#17ff93", GOLD = "#ffea85";

// Vectorcito de frente, en un lienzo de 512 x 512.
const ROBOT = `
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NEON}"/><stop offset="1" stop-color="#0fc477"/></linearGradient></defs>
  <rect x="82" y="226" width="34" height="104" rx="17" fill="url(#g)"/><rect x="396" y="226" width="34" height="104" rx="17" fill="url(#g)"/>
  <rect x="170" y="408" width="56" height="52" rx="14" fill="url(#g)"/><rect x="286" y="408" width="56" height="52" rx="14" fill="url(#g)"/>
  <rect x="244" y="102" width="24" height="76" rx="12" fill="url(#g)"/><circle cx="256" cy="92" r="30" fill="${GOLD}"/>
  <rect x="112" y="164" width="288" height="262" rx="64" fill="url(#g)"/>
  <rect x="150" y="206" width="212" height="150" rx="32" fill="${NAVY}"/>
  <rect x="190" y="244" width="36" height="62" rx="12" fill="${NEON}"/><rect x="286" y="244" width="36" height="62" rx="12" fill="${NEON}"/>
  <rect x="222" y="326" width="68" height="12" rx="6" fill="${NEON}"/>`;

/** scale < 1 deja margen alrededor (zona segura de los iconos adaptables). */
const svg = ({ bg, scale = 1 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg === "round" ? `<rect width="512" height="512" rx="112" fill="${NAVY}"/>` : bg === "full" ? `<rect width="512" height="512" fill="${NAVY}"/>` : ""}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${ROBOT}</g></svg>`;

const icons = {
  "favicon.svg": svg({ bg: "round", scale: 0.92 }),
};
mkdirSync("public", { recursive: true });
writeFileSync("public/favicon.svg", icons["favicon.svg"]);

const browser = await chromium.launch();
async function png(svgText, size, file, transparent = false) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:${transparent ? "transparent" : NAVY}">${svgText.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  const buf = await page.screenshot({ omitBackground: transparent });
  await page.close();
  if (file) writeFileSync(`public/${file}`, buf);
  return buf;
}

const round = svg({ bg: "round", scale: 0.92 });
const full = svg({ bg: "full", scale: 0.8 });
await png(round, 192, "icon-192.png", true);
await png(round, 512, "icon-512.png", true);
await png(full, 512, "icon-maskable-512.png"); // para iconos adaptables de Android: el dibujo queda dentro del 80 % central
await png(svg({ bg: "full", scale: 0.86 }), 180, "apple-touch-icon.png"); // iOS redondea las esquinas solo y no admite transparencia

// favicon.ico con tres tamaños (cada uno es un PNG dentro del contenedor ICO)
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await png(round, s, null, true));
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync("public/favicon.ico", Buffer.concat([head, ...dir, ...pngs]));

// Imagen para compartir en redes y chats (1200 x 630)
const font = readFileSync("node_modules/@fontsource/syne-mono/files/syne-mono-latin-400-normal.woff2").toString("base64");
const inter = readFileSync("node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2").toString("base64");
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(`<style>
  @font-face{font-family:Syne;src:url(data:font/woff2;base64,${font})} @font-face{font-family:Inter;src:url(data:font/woff2;base64,${inter})}
  body{margin:0;width:1200px;height:630px;background:radial-gradient(900px 500px at 25% 55%,#14145c 0%,${NAVY} 70%);position:relative;overflow:hidden;font-family:Syne}
  .grid{position:absolute;left:-100px;right:-100px;bottom:-120px;height:330px;background:repeating-linear-gradient(0deg,rgba(23,255,147,.55) 0 2px,transparent 2px 46px),repeating-linear-gradient(90deg,rgba(23,255,147,.35) 0 2px,transparent 2px 90px);transform:perspective(500px) rotateX(62deg);opacity:.55}
  .robot{position:absolute;left:70px;top:95px;width:440px;height:440px;filter:drop-shadow(0 0 40px rgba(23,255,147,.45))}
  h1{position:absolute;left:540px;top:160px;margin:0;font-weight:400;font-size:98px;line-height:1.05;color:${NEON};letter-spacing:-2px;text-shadow:0 0 30px rgba(23,255,147,.4)}
  h1 span{display:block;color:#eaeaea;text-shadow:none}
  p{position:absolute;left:545px;margin:0;font-family:Inter;color:#cfd0ff}
  .a{top:420px;font-size:40px;color:#eaeaea} .b{top:480px;font-size:28px;color:#a9a9d0}
  .cur{display:inline-block;width:42px;height:80px;background:${NEON};margin-left:12px;vertical-align:-6px}
</style><div class="grid"></div><div class="robot">${svg({ bg: "", scale: 1 }).replace("<svg ", '<svg width="440" height="440" ')}</div>
<h1>VECTORCITOS<span>RUN<i class="cur"></i></span></h1><p class="a">Aprende mecanografía jugando</p><p class="b">Learn to type by playing</p>`);
await og.waitForTimeout(300);
writeFileSync("public/og-image.jpg", await og.screenshot({ type: "jpeg", quality: 90 })); // JPEG: pesa 5 veces menos y los chats aceptan hasta ~600 kB
await browser.close();
console.log("listo: favicon.svg, favicon.ico, icon-192/512, icon-maskable-512, apple-touch-icon, og-image.jpg");
