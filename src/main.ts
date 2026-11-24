import "@fontsource/syne-mono";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "./style.css";
import { createScene } from "./scene";
import { start } from "./ui";

start(createScene(document.getElementById("scene") as HTMLCanvasElement));
