import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Diff } from "./content";
import { ITEMS } from "./cosmetics";
import { device } from "./device";
import { createHero } from "./hero";
import { createWorld, type Theme } from "./world";

export function createScene(canvas: HTMLCanvasElement) {
  // En teléfonos se cuida la batería: sin brillo de neón y con menos detalle.
  const low = device.kind === "phone";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low });
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.5 : 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050429, 25, 95);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);

  scene.add(new THREE.HemisphereLight(0xaab4ff, 0x1a1040, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6a8cff, 0.9); // luz de contorno desde atrás
  rim.position.set(-5, 4, -8);
  scene.add(rim);

  const world = createWorld(scene, { low });
  const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // reflejos para el cromado
  const hero = createHero(scene, envTex);

  // Brillo de neón (solo en pantallas grandes)
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!low) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // Chispas: un solo grupo de puntos que se reparte entre explosiones.
  const P = 160;
  const pPos = new Float32Array(P * 3).fill(999);
  const pCol = new Float32Array(P * 3);
  const pVel = new Float32Array(P * 3);
  const pLife = new Float32Array(P);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 12, sizeAttenuation: false, vertexColors: true, transparent: true, fog: false, depthWrite: false, alphaTest: 0.05 }));
  // Forma de las partículas: se dibuja una vez en un lienzo (círculo, corazón, estrella o llama).
  const shapeTex = (shape: string) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const g = cv.getContext("2d")!; g.fillStyle = "#fff"; g.translate(32, 32);
    if (shape === "heart") { g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -20, -26, 0, -10); g.bezierCurveTo(20, -26, 34, -2, 0, 22); g.fill(); }
    else if (shape === "star") { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 11 : 28, a = (k * Math.PI) / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
    else if (shape === "flame") { g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(26, -6, 22, 26, 0, 28); g.bezierCurveTo(-22, 26, -26, -6, 0, -30); g.fill(); }
    else { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 28); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-32, -32, 64, 64); }
    return new THREE.CanvasTexture(cv);
  };
  const SHAPES: Record<string, THREE.Texture> = {};
  const setShape = (shape: string) => { const m = sparks.material as THREE.PointsMaterial; m.map = SHAPES[shape] ??= shapeTex(shape); m.needsUpdate = true; };
  sparks.frustumCulled = false;
  scene.add(sparks);
  setShape("dot");
  let pNext = 0;
  let trail: number | "rainbow" | null = null; // estela que lleva el jugador
  let trailT = 0;
  const c = new THREE.Color(), o = new THREE.Vector3();
  const burst = (hex: number, n: number, power: number) => {
    hero.headWorld(o);
    for (let k = 0; k < n; k++) {
      const i = pNext++ % P;
      pPos.set([o.x, o.y, 0], i * 3);
      pVel.set([(Math.random() - 0.5) * power, Math.random() * power * 0.9 + 1, (Math.random() - 0.5) * power], i * 3);
      if (trail === "rainbow") c.setHSL(Math.random(), 0.9, 0.6); else c.set(trail ?? hex);
      pCol.set([c.r, c.g, c.b], i * 3);
      pLife[i] = 0.7 + Math.random() * 0.5;
    }
  };

  // Estado
  type Mode = "menu" | "play" | "shop";
  let mode: Mode = "menu";
  let kbdOn = false; // ¿hay teclado de colores en pantalla? Cambia dónde se ve a Vectorcito.
  let progress = 0, speed = 3, boost = 0, shake = 0, jump = 0, celebrate = 0, hop = 0, sad = 0, flash = 0, travelled = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    bloom?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    const target = (mode === "play" ? 6 + progress * 10 : 3) + boost * 12;
    speed += (target - speed) * Math.min(1, dt * 4);
    boost = Math.max(0, boost - dt * 2.5);
    shake = Math.max(0, shake - dt * 3);
    jump = Math.max(0, jump - dt * 2.2);
    celebrate = Math.max(0, celebrate - dt * 0.4);
    hop = Math.max(0, hop - dt * 6);
    sad = Math.max(0, sad - dt * 2);
    flash = Math.max(0, flash - dt * 4);

    const run = reduce ? 0 : speed * dt;
    travelled += run;
    world.update(dt, run, time, speed, mode === "play");
    hero.update({ dt, time, T: travelled, speed, jump, hop, boost, sad, celebrate, shake, flash, reduce });

    camera.fov = 60 + boost * 5 + (mode === "play" ? Math.min(speed / 4, 4) : 0);
    camera.updateProjectionMatrix();

    if (trail !== null && mode !== "shop" && !reduce) { // la estela suelta partículas sin parar mientras corre
      trailT += dt;
      while (trailT > 0.045) {
        trailT -= 0.045;
        const i = pNext++ % P;
        pPos.set([(Math.random() - 0.5) * 0.7, 0.3 + Math.random() * 0.5, 0.5], i * 3);
        pVel.set([(Math.random() - 0.5) * 0.8, 2 + Math.random() * 1.5, 0.2], i * 3);
        if (trail === "rainbow") c.setHSL((time * 0.6 + Math.random() * 0.2) % 1, 0.9, 0.6); else c.set(trail);
        pCol.set([c.r, c.g, c.b], i * 3);
        pLife[i] = 0.5 + Math.random() * 0.4;
      }
    }
    for (let i = 0; i < P; i++) {
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = 999; continue; }
      pLife[i] -= dt;
      pVel[i * 3 + 1] -= 9 * dt;
      for (let a = 0; a < 3; a++) pPos[i * 3 + a] += pVel[i * 3 + a] * dt;
      pPos[i * 3 + 2] += speed * dt * 0.25; // el mundo avanza: las chispas se quedan atrás
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    if (mode === "shop") {
      const a = time * 0.45; // da la vuelta completa para ver todos los accesorios, por delante y por detrás
      camera.position.set(Math.sin(a) * 8.5, 1.6, Math.cos(a) * 8.5);
      camera.lookAt(0, -0.1, 0);
    } else if (mode === "menu") {
      const wide = camera.aspect > 1.2;
      camera.position.set(Math.sin(time * 0.25) * (wide ? 3 : 6), wide ? 2.6 : 3.2, 8);
      // en pantallas anchas Vectorcito queda a la derecha; en teléfonos verticales, abajo, fuera de los botones
      camera.lookAt(wide ? -4.6 : 0, wide ? 1.7 : camera.aspect < 0.75 ? 5.2 : 3.4, 0);
    } else {
      camera.position.set(0, (kbdOn ? 2.3 : 3) + progress * 0.4, 7.5);
      camera.lookAt(0, kbdOn ? 2.6 : 4.4, -6);
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return {
    theme(d: Diff | "menu") { world.setTheme(d as Theme); },
    mode(m: Mode) { mode = m; progress = 0; },
    /** Muestra lo que lleva puesto el jugador: accesorios, color y estela. */
    dress(worn: Record<string, string | undefined>) {
      const ids = Object.values(worn).filter((x): x is string => !!x);
      hero.dress(ids);
      const t = ITEMS.find((i) => ids.includes(i.id) && i.slot === "trail")?.trail ?? null;
      trail = t;
      setShape(ITEMS.find((i) => ids.includes(i.id) && i.slot === "trail")?.shape ?? "dot");
      world.setTrail(typeof t === "number" ? t : null);
    },
    /** Con teclado de colores abajo, Vectorcito se ve en el espacio libre del medio. */
    layout(kbd: boolean) { kbdOn = kbd; },
    progress(p: number) { progress = p; },
    key() { hop = 1; },
    word() { boost = 1; jump = 1; burst(0x17ff93, 14, 4); },
    error() { shake = 1; sad = 1; flash = 1; burst(0xff7070, 6, 2.5); },
    win() { celebrate = 1; burst(0xffc107, 40, 8); burst(0x17ff93, 30, 6); },
  };
}
