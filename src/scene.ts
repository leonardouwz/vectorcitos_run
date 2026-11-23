import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Diff } from "./content";

const THEMES: Record<Diff | "menu", { sky: number; accent: number; tower: number; sun: number }> = {
  menu:   { sky: 0x050429, accent: 0x17ff93, tower: 0x1a1a40, sun: 0x0b5a3c },
  easy:   { sky: 0x070a3a, accent: 0x17ff93, tower: 0x1a1a40, sun: 0xffea85 },
  medium: { sky: 0x050429, accent: 0x6ab7ff, tower: 0x14204d, sun: 0xeaeaea },
  hard:   { sky: 0x0a0426, accent: 0xff7070, tower: 0x2a1040, sun: 0xff7070 },
};
const CELL = 2;

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050429, 25, 90);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xaab4ff, 0x050429, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 8, 6);
  scene.add(key);

  // Suelo: rejilla que se desliza hacia la cámara.
  const grid = new THREE.GridHelper(160, 80, 0x17ff93, 0x17ff93);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.55;
  scene.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: 0x050429 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  // Torres a los lados.
  const N = 40;
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1a1a40, emissive: 0x0a0a35, roughness: 0.6 }), N * 2);
  const towerData = Array.from({ length: N * 2 }, (_, i) => ({
    side: i % 2 ? 1 : -1,
    z: -(i >> 1) * 4.5,
    w: 1.5 + Math.random() * 2,
    h: 2 + Math.random() * 9,
    x: 7 + Math.random() * 5,
  }));
  scene.add(towers);
  const m4 = new THREE.Matrix4();
  const placeTowers = () => towerData.forEach((d, i) => {
    m4.compose(new THREE.Vector3(d.side * d.x, d.h / 2, d.z), new THREE.Quaternion(), new THREE.Vector3(d.w, d.h, d.w));
    towers.setMatrixAt(i, m4);
  });
  placeTowers();

  // Sol / luna y estrellas.
  const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshBasicMaterial({ color: 0xffea85, fog: false }));
  sun.position.set(0, 14, -120);
  scene.add(sun);
  const starPos = new Float32Array(300 * 3).map((_, i) => (i % 3 === 1 ? 10 + Math.random() * 60 : (Math.random() - 0.5) * 220));
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, fog: false }));
  stars.position.z = -110;
  scene.add(stars);

  // Vectorcito: personaje hecho con formas simples. Si existe public/models/vectorcito.glb lo reemplaza.
  const hero = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({ color: 0x17ff93, emissive: 0x17ff93, emissiveIntensity: 0.35, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050429, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffea85, emissive: 0xffea85, emissiveIntensity: 0.8 });
  const procedural = new THREE.Group();
  const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return o;
  };
  const body = part(new RoundedBoxGeometry(1.15, 1.05, 0.95, 4, 0.2), glow, 0, 1.3, 0);
  const screen = part(new RoundedBoxGeometry(0.88, 0.6, 0.06, 3, 0.05), dark, 0, 1.33, -0.47);
  const eyeL = part(new THREE.BoxGeometry(0.15, 0.22, 0.03), glow, -0.2, 1.4, -0.51);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  const mouth = part(new THREE.BoxGeometry(0.3, 0.05, 0.03), glow, 0, 1.2, -0.51);
  const stick = part(new THREE.CylinderGeometry(0.03, 0.03, 0.4), glow, 0, 0.2, 0);
  const bulb = part(new THREE.SphereGeometry(0.1, 16, 12), gold, 0, 0.42, 0);
  const antenna = new THREE.Group();
  antenna.add(stick, bulb);
  antenna.position.set(0, 1.82, 0);
  const limb = (x: number, y: number, w: number, h: number) => {
    const g = new THREE.BoxGeometry(w, h, w);
    g.translate(0, -h / 2, 0);
    const o = new THREE.Mesh(g, glow);
    o.position.set(x, y, 0);
    return o;
  };
  const legL = limb(-0.28, 0.8, 0.28, 0.8), legR = limb(0.28, 0.8, 0.28, 0.8);
  const armL = limb(-0.7, 1.6, 0.2, 0.6), armR = limb(0.7, 1.6, 0.2, 0.6);
  procedural.add(body, screen, eyeL, eyeR, mouth, antenna, legL, legR, armL, armR);
  hero.add(procedural);
  scene.add(hero);

  void fetch("/models/vectorcito.glb", { method: "HEAD" }).then((r) => {
    if (!r.ok || (r.headers.get("content-type") ?? "").includes("html")) return;
    new GLTFLoader().load("/models/vectorcito.glb", (g) => { procedural.visible = false; hero.add(g.scene); });
  }).catch(() => { /* sin modelo propio: se queda el personaje base */ });

  // Chispas: un solo grupo de puntos que se reparte entre explosiones.
  const P = 80;
  const pPos = new Float32Array(P * 3).fill(999);
  const pCol = new Float32Array(P * 3);
  const pVel = new Float32Array(P * 3);
  const pLife = new Float32Array(P);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, fog: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let pNext = 0;
  const burst = (hex: number, n: number, power: number) => {
    const c = new THREE.Color(hex);
    for (let k = 0; k < n; k++) {
      const i = pNext++ % P;
      pPos.set([hero.position.x, 1.8 + hero.position.y, 0], i * 3);
      pVel.set([(Math.random() - 0.5) * power, Math.random() * power * 0.9 + 1, (Math.random() - 0.5) * power], i * 3);
      pCol.set([c.r, c.g, c.b], i * 3);
      pLife[i] = 0.7 + Math.random() * 0.5;
    }
  };

  // Estado
  let mode: "menu" | "play" = "menu";
  let progress = 0;
  let speed = 3;
  let boost = 0;
  let shake = 0;
  let jump = 0;
  let celebrate = 0;
  let hop = 0;
  let sad = 0;
  let blink = 2;
  let travelled = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  const time0 = () => clock.elapsedTime;
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const target = (mode === "play" ? 6 + progress * 10 : 3) + boost * 12;
    speed += (target - speed) * Math.min(1, dt * 4);
    boost = Math.max(0, boost - dt * 2.5);
    shake = Math.max(0, shake - dt * 3);
    jump = Math.max(0, jump - dt * 2.2);
    celebrate = Math.max(0, celebrate - dt * 0.4);

    const run = reduce ? 0 : speed * dt;
    travelled += run;
    grid.position.z = travelled % CELL;
    towerData.forEach((d) => { d.z += run; if (d.z > 10) d.z -= N * 4.5; });
    placeTowers();
    towers.instanceMatrix.needsUpdate = true;

    const T = travelled;
    hop = Math.max(0, hop - dt * 6);
    sad = Math.max(0, sad - dt * 2);
    const swing = Math.sin(T * 1.6) * 0.8;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.9;
    armR.rotation.x = swing * 0.9;
    if (celebrate > 0) { armL.rotation.z = armR.rotation.z = 0; armL.rotation.x = armR.rotation.x = Math.PI * 0.85; }
    const air = Math.abs(Math.sin(jump * Math.PI)) * 1.6 + hop * 0.25;
    hero.position.y = air + (reduce ? 0 : Math.abs(Math.sin(T * 1.6)) * 0.08);
    // estirar al saltar, aplastar al caer
    const stretch = 1 + (jump > 0.5 ? 0.14 : jump > 0 ? -0.1 : 0) * Math.min(1, jump * 2);
    hero.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    hero.rotation.y = celebrate > 0 ? celebrate * Math.PI * 4 : 0;
    hero.position.x = (Math.random() - 0.5) * shake * 0.25;
    antenna.rotation.z = Math.sin(time0() * 5) * 0.25 + swing * 0.15;
    (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(time0() * 6) * 0.3 + boost;
    blink -= dt;
    const closed = blink < 0.12 && blink > 0;
    if (blink <= 0) blink = 2 + Math.random() * 2.5;
    eyeL.scale.y = eyeR.scale.y = closed ? 0.1 : sad > 0 ? 0.6 : 1;
    mouth.scale.set(sad > 0 ? 0.6 : 1 + boost * 0.8, sad > 0 ? 1 : 1 + boost * 3, 1);
    camera.fov = 60 + boost * 5;
    camera.updateProjectionMatrix();

    for (let i = 0; i < P; i++) {
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = 999; continue; }
      pLife[i] -= dt;
      pVel[i * 3 + 1] -= 9 * dt;
      for (let a = 0; a < 3; a++) pPos[i * 3 + a] += pVel[i * 3 + a] * dt;
      pPos[i * 3 + 2] += speed * dt * 0.5; // el mundo avanza: las chispas se quedan atrás
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    const time = clock.elapsedTime;
    if (mode === "menu") {
      camera.position.set(Math.sin(time * 0.25) * 6, 3.2, 8);
      camera.lookAt(0, 3.4, 0);
    } else {
      camera.position.set(0, 3 + progress * 0.4, 7.5);
      camera.lookAt(0, 4.4, -6);
    }
    stars.rotation.y += dt * 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return {
    theme(d: Diff | "menu") {
      const th = THEMES[d];
      (scene.background as THREE.Color | null) = new THREE.Color(th.sky);
      (scene.fog as THREE.Fog).color.set(th.sky);
      (floor.material as THREE.MeshBasicMaterial).color.set(th.sky);
      const gm = grid.material as THREE.LineBasicMaterial;
      gm.color.set(th.accent);
      (towers.material as THREE.MeshStandardMaterial).color.set(th.tower);
      (sun.material as THREE.MeshBasicMaterial).color.set(th.sun);
      stars.visible = d !== "easy";
    },
    mode(m: "menu" | "play") { mode = m; progress = 0; },
    progress(p: number) { progress = p; },
    key() { hop = 1; },
    word() { boost = 1; jump = 1; burst(0x17ff93, 14, 4); },
    error() { shake = 1; sad = 1; burst(0xff7070, 6, 2.5); },
    win() { celebrate = 1; burst(0xffc107, 40, 8); burst(0x17ff93, 30, 6); },
  };
}
