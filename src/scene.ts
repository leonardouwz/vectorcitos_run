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
import { createParticles } from "./trails";
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

  // Chispas y estelas (src/trails.ts)
  const fx = createParticles(scene, renderer, low);
  let trailOn = false;
  const o = new THREE.Vector3();
  const burst = (hex: number, n: number, power: number) => { hero.headWorld(o); fx.burst(o.x, o.y, hex, n, power); };

  // Error: onda roja que sale de Vectorcito y estrellitas de mareo que giran sobre su cabeza
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), ringMat);
  ring.visible = false; scene.add(ring);
  const dizzy = new THREE.Group();
  const dizzyMat = new THREE.MeshBasicMaterial({ color: 0xffd54a });
  for (let k = 0; k < 4; k++) dizzy.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.16), dizzyMat));
  dizzy.visible = false; scene.add(dizzy);
  let wave = 0; // 0 = sin onda; sube a 1 mientras se expande

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
    shake = Math.max(0, shake - dt * 2.2);
    wave = Math.max(0, wave - dt * 1.6);
    jump = Math.max(0, jump - dt * 2.2);
    celebrate = Math.max(0, celebrate - dt * 0.4);
    hop = Math.max(0, hop - dt * 6);
    sad = Math.max(0, sad - dt * 2);
    flash = Math.max(0, flash - dt * 4);

    const run = reduce ? 0 : speed * dt;
    travelled += run;
    world.update(dt, run, time, speed, mode === "play");
    hero.update({ dt, time, T: travelled, speed, jump, hop, boost, sad, celebrate, shake, flash, reduce });


    // onda de error y mareo
    if (wave > 0 && !reduce) {
      const k = 1 - wave; // 0 → 1
      ring.visible = true; ring.position.set(hero.group.position.x, 0.08, 0); ring.scale.setScalar(0.6 + k * 7); ringMat.opacity = wave * 0.9;
    } else ring.visible = false;
    if (sad > 0 && !reduce) {
      dizzy.visible = true; hero.headWorld(o); dizzy.position.set(o.x, o.y + 0.55, 0);
      dizzy.children.forEach((c, i) => { const a = time * 7 + (i * Math.PI) / 2; c.position.set(Math.cos(a) * 0.55, Math.sin(time * 9 + i) * 0.08, Math.sin(a) * 0.35); c.rotation.y = time * 5; });
    } else dizzy.visible = false;

    camera.fov = 60 + boost * 5 + (mode === "play" ? Math.min(speed / 4, 4) : 0);
    camera.updateProjectionMatrix();

    fx.update(dt, time, speed, hero.group.position.x, hero.group.position.y, trailOn && !reduce);

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
    if (shake > 0 && !reduce && mode !== "shop") { // la cámara se sacude con el error
      const m = shake * shake * 0.35;
      camera.position.x += (Math.random() - 0.5) * m; camera.position.y += (Math.random() - 0.5) * m;
      camera.rotation.z += (Math.random() - 0.5) * m * 0.06;
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
      const item = ITEMS.find((i) => ids.includes(i.id) && i.slot === "trail");
      trailOn = !!item;
      fx.set(item?.id ?? null, item?.shape ?? "dot");
      world.setTrail(typeof item?.trail === "number" ? item.trail : null);
    },
    /** Con teclado de colores abajo, Vectorcito se ve en el espacio libre del medio. */
    layout(kbd: boolean) { kbdOn = kbd; },
    progress(p: number) { progress = p; },
    key() { hop = 1; },
    word() { boost = 1; jump = 1; burst(0x17ff93, 14, 4); },
    error() { shake = 1; sad = 1.2; flash = 1; wave = 1; burst(0xff5050, 18, 4.5); },
    win() { celebrate = 1; burst(0xffc107, 40, 8); burst(0x17ff93, 30, 6); },
  };
}
