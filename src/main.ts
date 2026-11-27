import "@fontsource/syne-mono";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "./style.css";
import { applyDevice, noteKey } from "./device";
import { createScene } from "./scene";
import { refreshLevels } from "./remote";
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

// Los niveles que añade el administrador se descargan antes de empezar (máximo 1,5 s de espera).
const levels = refreshLevels();
await Promise.race([levels, new Promise((r) => setTimeout(r, 1500))]);
start(createScene(document.getElementById("scene") as HTMLCanvasElement));
