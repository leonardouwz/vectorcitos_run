// Partículas: estelas del jugador (una distinta por cada una) y chispas al acertar o fallar.
import * as THREE from "three";

type Shape = "dot" | "heart" | "star" | "flame" | "flake";
interface Style {
  shape: Shape;
  rate: number;                       // partículas por segundo
  life: [number, number];
  size: [number, number];             // píxeles
  spawn: (p: THREE.Vector3, v: THREE.Vector3, t: number) => void; // posición (relativa al jugador) y velocidad iniciales
  grav: number;                       // + cae, - sube
  spin: number;                       // giro (rad/s)
  color: (k: number, seed: number, t: number, out: THREE.Color) => void; // k: 0 recién nacida → 1 a punto de desaparecer
  alpha?: (k: number, seed: number, t: number) => number;
  scale?: (k: number) => number;      // multiplicador del tamaño durante la vida
  sway?: number;                      // vaivén lateral
}

const r = (a: number, b: number) => a + Math.random() * (b - a);
const hsl = (h: number, s: number, l: number, o: THREE.Color) => o.setHSL(((h % 1) + 1) % 1, s, l);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
/** Entra rápido, se mantiene y sale suave. */
const bell = (k: number) => Math.min(1, k * 6) * Math.min(1, (1 - k) * 2.2);

export const STYLES: Record<string, Style> = {
  // Orbes de neón que dejan un rastro luminoso a los pies
  "trail-neon": {
    shape: "dot", rate: 90, life: [0.7, 1.1], size: [34, 64],
    spawn: (p, v) => { p.set(r(-0.4, 0.4), r(0.15, 0.6), r(0.3, 0.7)); v.set(r(-0.4, 0.4), r(0.3, 1.2), r(0.17, 0.52)); },
    grav: 0, spin: 0, color: (k, s, t, o) => hsl(mix(0.4, 0.5, s), 1, mix(0.62, 0.5, k), o), alpha: (k) => bell(k) * 0.95, scale: (k) => mix(1.1, 0.3, k),
  },
  // Estrellitas doradas que parpadean y flotan alrededor
  "trail-gold": {
    shape: "star", rate: 50, life: [0.9, 1.5], size: [30, 58],
    spawn: (p, v) => { const s = Math.random() < 0.5 ? -1 : 1; p.set(s * r(0.4, 1.1), r(0.2, 1.8), r(0.2, 0.9)); v.set(s * r(0.1, 0.5), r(0.3, 1.0), r(0.17, 0.49)); },
    grav: -0.3, spin: 3, color: (k, s, t, o) => hsl(mix(0.11, 0.15, s), 1, mix(0.62, 0.72, s), o),
    alpha: (k, s, t) => bell(k) * (0.65 + 0.35 * Math.sin(t * 22 + s * 40)), scale: (k) => mix(0.7, 1.2, Math.min(1, k * 3)) * mix(1, 0.4, k),
  },
  // Corazones que suben ondeando
  "trail-hearts": {
    shape: "heart", rate: 26, life: [1.3, 1.9], size: [46, 84],
    spawn: (p, v) => { const s = Math.random() < 0.5 ? -1 : 1; p.set(s * r(0.5, 1.0), r(0.1, 0.7), r(0.2, 0.8)); v.set(0, r(1.4, 2.4), r(0.14, 0.42)); },
    grav: 0, spin: 0, sway: 0.9,
    color: (k, s, t, o) => hsl(mix(0.93, 1.0, s), mix(0.9, 0.7, k), mix(0.62, 0.78, s), o), alpha: (k) => bell(k), scale: (k) => mix(0.3, 1.1, Math.min(1, k * 3.5)),
  },
  // Lluvia de estrellas de colores que cae desde arriba
  "trail-stars": {
    shape: "star", rate: 70, life: [1.0, 1.6], size: [32, 62],
    spawn: (p, v) => { p.set(r(-1.6, 1.6), r(2.4, 3.6), r(-0.5, 0.9)); v.set(r(-0.3, 0.3), r(-1.2, -0.2), r(0.10, 0.35)); },
    grav: 2.2, spin: 6, color: (k, s, t, o) => hsl(s + t * 0.4, 0.95, 0.6, o), alpha: (k) => bell(k), scale: (k) => mix(1.2, 0.5, k),
  },
  // Llamas que suben desde el suelo: amarillo → naranja → rojo
  "trail-fire": {
    shape: "flame", rate: 110, life: [0.6, 1.0], size: [56, 100],
    spawn: (p, v) => { p.set(r(-0.55, 0.55), r(0.0, 0.3), r(0.2, 0.8)); v.set(r(-0.3, 0.3), r(1.6, 3.2), r(0.14, 0.49)); },
    grav: -1.5, spin: 0, sway: 0.25,
    color: (k, s, t, o) => hsl(mix(0.14, 0.0, Math.min(1, k * 1.2)), 1, mix(0.62, 0.45, k), o), alpha: (k) => Math.min(1, k * 8) * (1 - k * k) * 0.95, scale: (k) => mix(1, 0.2, k),
  },
  // Cinta arcoíris ondulante
  "trail-rainbow": {
    shape: "dot", rate: 150, life: [1.0, 1.3], size: [40, 62],
    spawn: (p, v, t) => { p.set(Math.sin(t * 7) * 0.55, 0.35 + Math.cos(t * 7) * 0.12, 0.35); v.set(0, 0, 0.3); },
    grav: 0, spin: 0, color: (k, s, t, o) => hsl(t * 0.7 - k * 0.5, 1, 0.58, o), alpha: (k) => bell(k) * 0.95, scale: (k) => mix(1, 0.5, k),
  },
  // Copos de cristal que bajan lentos y brillan
  "trail-ice": {
    shape: "flake", rate: 48, life: [1.2, 1.9], size: [40, 76],
    spawn: (p, v) => { p.set(r(-1.3, 1.3), r(0.6, 2.6), r(0.1, 0.9)); v.set(r(-0.3, 0.3), r(-0.2, 0.3), r(0.10, 0.35)); },
    grav: 0.35, spin: 1.5, sway: 0.5,
    color: (k, s, t, o) => hsl(mix(0.52, 0.58, s), mix(0.7, 0.3, s), mix(0.72, 0.9, s), o), alpha: (k, s, t) => bell(k) * (0.75 + 0.25 * Math.sin(t * 14 + s * 30)), scale: (k) => mix(0.6, 1, Math.min(1, k * 4)),
  },
};

/** Dibuja la forma una sola vez en un lienzo: blanca con borde gris, para que el color la tiña y se vea sobre cualquier fondo. */
function shapeTexture(shape: Shape) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 96;
  const g = cv.getContext("2d")!; g.translate(48, 48); g.lineJoin = "round";
  const path = () => {
    g.beginPath();
    if (shape === "heart") { g.moveTo(0, 34); g.bezierCurveTo(-52, -4, -30, -40, 0, -16); g.bezierCurveTo(30, -40, 52, -4, 0, 34); }
    else if (shape === "star") { for (let k = 0; k < 10; k++) { const rad = k % 2 ? 17 : 42, a = (k * Math.PI) / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); }
    else if (shape === "flame") { g.moveTo(0, -46); g.bezierCurveTo(10, -26, 38, -8, 32, 20); g.bezierCurveTo(28, 40, 8, 46, 0, 46); g.bezierCurveTo(-8, 46, -28, 40, -32, 20); g.bezierCurveTo(-36, 0, -14, -14, 0, -46); }
  };
  if (shape === "dot") {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 46);
    gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, "#fff"); gr.addColorStop(0.7, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(-48, -48, 96, 96);
  } else if (shape === "flake") {
    g.strokeStyle = "#555"; g.lineWidth = 12; g.lineCap = "round";
    const arms = () => { for (let k = 0; k < 6; k++) { g.save(); g.rotate((k * Math.PI) / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -40); g.moveTo(0, -24); g.lineTo(-12, -34); g.moveTo(0, -24); g.lineTo(12, -34); g.stroke(); g.restore(); } };
    arms(); g.strokeStyle = "#fff"; g.lineWidth = 6; arms();
  } else {
    path(); g.strokeStyle = "#555"; g.lineWidth = 8; g.stroke(); g.fillStyle = "#fff"; g.fill();
    g.save(); g.clip(); g.fillStyle = "rgba(255,255,255,.0)"; g.restore();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const VERT = `attribute float aSize; attribute float aAlpha; attribute float aRot; attribute vec3 aColor;
uniform float uPR; varying vec3 vC; varying float vA; varying float vR;
void main(){ vC = aColor; vA = aAlpha; vR = aRot; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * 0.6 * uPR * clamp(8.0 / max(0.5, -mv.z), 0.7, 1.25); }`;
const FRAG = `uniform sampler2D uMap; varying vec3 vC; varying float vA; varying float vR;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + 0.5; vec4 t = texture2D(uMap, p); if (t.a * vA < 0.02) discard; gl_FragColor = vec4(t.rgb * vC, t.a * vA); }`;

export function createParticles(scene: THREE.Scene, renderer: THREE.WebGLRenderer, low: boolean) {
  const N = low ? 260 : 520;
  const pos = new Float32Array(N * 3).fill(999), vel = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const size = new Float32Array(N), alpha = new Float32Array(N), rot = new Float32Array(N);
  const bst = new Uint8Array(N), age = new Float32Array(N), max = new Float32Array(N).fill(0), seed = new Float32Array(N), base = new Float32Array(N), sp = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute("aRot", new THREE.BufferAttribute(rot, 1));
  const tex: Partial<Record<Shape, THREE.Texture>> = {};
  const uniforms = { uMap: { value: null as THREE.Texture | null }, uPR: { value: renderer.getPixelRatio() } };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false }));
  points.frustumCulled = false;
  scene.add(points);

  let style: Style | null = null, styleId = "";
  let next = 0, acc = 0;
  const setShape = (s: Shape) => { uniforms.uMap.value = tex[s] ??= shapeTexture(s); };
  setShape("dot");
  const c = new THREE.Color(), P = new THREE.Vector3(), V = new THREE.Vector3();

  const put = (i: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, px: number, s: number, color: THREE.Color) => {
    pos.set([x, y, z], i * 3); vel.set([vx, vy, vz], i * 3); col.set([color.r, color.g, color.b], i * 3);
    age[i] = 0; bst[i] = 0; max[i] = life; seed[i] = Math.random(); base[i] = px; size[i] = px; rot[i] = Math.random() * 6.28; sp[i] = s;
  };

  return {
    /** Elige la estela (por el id del artículo) o ninguna. */
    set(id: string | null, shp: Shape) {
      styleId = id ?? ""; style = id ? STYLES[id] ?? null : null;
      setShape(style?.shape ?? shp);
    },
    /** Estallido de chispas (palabra, error, victoria). Usa la forma y el color de la estela puesta. */
    burst(x: number, y: number, hex: number, n: number, power: number) {
      for (let k = 0; k < n; k++) {
        const i = next++ % N;
        if (style && styleId) style.color(Math.random() * 0.3, Math.random(), performance.now() / 1000, c); else c.set(hex);
        const a = Math.random() * 6.28, up = Math.random() * power * 0.9 + 1;
        put(i, x, y, 0, Math.cos(a) * power * 0.6, up, Math.sin(a) * power * 0.6, r(0.7, 1.3), r(26, 52), r(-4, 4), c);
        bst[i] = 1; // es un estallido: cae con gravedad normal
      }
    },
    /** Cada cuadro: mueve las partículas y suelta las nuevas de la estela. `x`,`y`: dónde está el jugador. */
    update(dt: number, t: number, worldSpeed: number, x: number, y: number, emitting: boolean) {
      uniforms.uPR.value = renderer.getPixelRatio(); // la resolución puede cambiar sola
      if (style && emitting) {
        acc += dt * style.rate;
        while (acc >= 1) {
          acc -= 1;
          const i = next++ % N;
          style.spawn(P, V, t);
          style.color(0, Math.random(), t, c);
          put(i, x + P.x, y + P.y, P.z, V.x, V.y, V.z, r(style.life[0], style.life[1]), r(style.size[0], style.size[1]), r(-1, 1) * style.spin, c);
        }
      }
      for (let i = 0; i < N; i++) {
        if (max[i] <= 0) continue;
        const burst = bst[i] === 1;
        age[i] += dt;
        const k = age[i] / max[i];
        if (k >= 1) { max[i] = 0; pos[i * 3 + 1] = 999; alpha[i] = 0; continue; }
        const g = burst ? 9 : style?.grav ?? 0;
        vel[i * 3 + 1] -= g * dt;
        pos[i * 3] += vel[i * 3] * dt + (!burst && style?.sway ? Math.cos(t * 5 + seed[i] * 20) * style.sway * dt : 0);
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt + worldSpeed * dt * 0.25; // el mundo avanza: las partículas se quedan atrás
        rot[i] += sp[i] * dt;
        if (burst || !style) { alpha[i] = Math.min(1, (1 - k) * 2); size[i] = base[i] * (1 - k * 0.5); }
        else {
          style.color(k, seed[i], t, c);
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
          alpha[i] = style.alpha ? style.alpha(k, seed[i], t) : 1 - k;
          size[i] = base[i] * (style.scale ? style.scale(k) : 1);
        }
      }
      for (const n of ["position", "aColor", "aSize", "aAlpha", "aRot"]) (geo.attributes[n] as THREE.BufferAttribute).needsUpdate = true;
    },
    get active() { return !!style; },
  };
}
