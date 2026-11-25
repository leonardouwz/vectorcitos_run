import "@fontsource/syne-mono";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "./style.css";
import { applyDevice, noteKey } from "./device";
import { loadIcons } from "./icons";
import { createScene } from "./scene";
import { start } from "./ui";

applyDevice();
addEventListener("keydown", noteKey);

// Con el teclado de pantalla abierto, la zona visible es más baja: se ajusta para que la frase no quede tapada.
const vv = window.visualViewport;
const fit = () => {
  const root = document.documentElement.style;
  root.setProperty("--vh", `${vv?.height ?? innerHeight}px`);
  root.setProperty("--vt", `${vv?.offsetTop ?? 0}px`);
};
vv?.addEventListener("resize", fit);
vv?.addEventListener("scroll", fit);
fit();

// Permite instalar el juego y abrirlo sin conexión (solo en la versión publicada).
declare const __BUILD__: string;
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => { navigator.serviceWorker.register(`/sw.js?v=${__BUILD__}`).catch(() => { /* sin service worker el juego funciona igual */ }); });
}

await loadIcons(); // los iconos se cargan aparte; se espera antes de dibujar la primera pantalla
start(createScene(document.getElementById("scene") as HTMLCanvasElement));
