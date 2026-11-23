import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
  const dark = new THREE.MeshStandardMaterial({ color: 0x050429, roughness: 0.5 });
  const procedural = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glow);
  body.position.y = 1.1;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), dark);
  face.position.set(0, 1.2, -0.52);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.02), glow);
  eyeL.position.set(-0.2, 1.22, -0.55);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.28), glow);
  legL.geometry.translate(0, -0.3, 0);
  legL.position.set(-0.25, 0.6, 0);
  const legR = legL.clone();
  legR.position.x = 0.25;
  procedural.add(body, face, eyeL, eyeR, legL, legR);
  hero.add(procedural);
  scene.add(hero);

  void fetch("/models/vectorcito.glb", { method: "HEAD" }).then((r) => {
    if (!r.ok || (r.headers.get("content-type") ?? "").includes("html")) return;
    new GLTFLoader().load("/models/vectorcito.glb", (g) => { procedural.visible = false; hero.add(g.scene); });
  }).catch(() => { /* sin modelo propio: se queda el personaje base */ });

  // Estado
  let mode: "menu" | "play" = "menu";
  let progress = 0;
  let speed = 3;
  let boost = 0;
  let shake = 0;
  let jump = 0;
  let celebrate = 0;
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
    const swing = Math.sin(T * 1.6) * 0.8;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    hero.position.y = Math.abs(Math.sin(jump * Math.PI)) * 1.6 + (reduce ? 0 : Math.abs(Math.sin(T * 1.6)) * 0.08);
    hero.rotation.y = celebrate > 0 ? celebrate * Math.PI * 4 : 0;
    hero.position.x = (Math.random() - 0.5) * shake * 0.25;

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
    word() { boost = 1; jump = 1; },
    error() { shake = 1; },
    win() { celebrate = 1; },
  };
}
