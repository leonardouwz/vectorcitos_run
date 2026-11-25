// Vectorcito: el personaje 3D, sus accesorios, sus colores y sus movimientos.
// Usa el modelo generado (public/models/vectorcito.glb). Si no carga, se dibuja uno sencillo con formas básicas.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ITEMS } from "./cosmetics";

export interface HeroState {
  dt: number; time: number; T: number; speed: number;
  jump: number; hop: number; boost: number; sad: number; celebrate: number; shake: number; flash: number;
  reduce: boolean;
}

/** Puntos del cuerpo donde se colocan los accesorios, en unidades del mundo. */
interface Anchors { headTop: number; faceY: number; faceZ: number; eyeDX: number; bodyW: number; bodyD: number; chestY: number; backTop: number; sc: number }

// El personaje mira hacia -z (se ve su espalda mientras corre).
const SIMPLE: Anchors = { headTop: 1.825, faceY: 1.4, faceZ: -0.5, eyeDX: 0.2, bodyW: 0.58, bodyD: 0.48, chestY: 0.95, backTop: 1.78, sc: 1 };
const MODEL_H = 2.2;                    // altura del modelo en el juego
const MODEL_BOX_H = 1.903;              // altura del modelo original
const S = MODEL_H / MODEL_BOX_H;
const FROM_MODEL = (y: number) => (y + 0.952) * S; // altura del modelo original → mundo
const MODEL: Anchors = { headTop: FROM_MODEL(0.455), faceY: FROM_MODEL(-0.09), faceZ: -0.5, eyeDX: 0.25, bodyW: 0.72 * S, bodyD: 0.41 * S, chestY: FROM_MODEL(-0.36), backTop: FROM_MODEL(0.3), sc: 1.3 };

const HUE = { value: 0 }; // giro de color (radianes) compartido por todo el cuerpo

/** Gira el color del material: así un mismo modelo sirve para todos los colores y para el destello rojo al fallar. */
function hueable(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHue = HUE;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uHue;\nvec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = hueRot(diffuseColor.rgb, uHue);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance = hueRot(totalEmissiveRadiance, uHue);");
  };
  mat.customProgramCacheKey = () => "hue";
}

const mat = (color: number, emissive = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? 0.6 : 0, roughness: 0.45, metalness: 0.2, ...extra });

export function createHero(scene: THREE.Scene) {
  const hero = new THREE.Group();
  hero.visible = false; // se muestra cuando el modelo carga (o falla), para que no se vea un cambio de personaje
  scene.add(hero);
  setTimeout(() => { hero.visible = true; }, 4000);

  const body = new THREE.Group();   // todo lo que se mueve con el cuerpo
  hero.add(body);
  let anchors = SIMPLE;
  let accessories: Record<string, THREE.Object3D> = {};
  let worn: string[] = [];

  // ---------- Versión sencilla (si no carga el modelo)
  const glow = new THREE.MeshStandardMaterial({ color: 0x17ff93, emissive: 0x17ff93, emissiveIntensity: 0.35, roughness: 0.4 });
  hueable(glow);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050429, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffea85, emissive: 0xffea85, emissiveIntensity: 0.8 });
  const simple = new THREE.Group();
  const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  const sBody = part(new RoundedBoxGeometry(1.15, 1.05, 0.95, 4, 0.2), glow, 0, 1.3, 0);
  const sScreen = part(new RoundedBoxGeometry(0.88, 0.6, 0.06, 3, 0.05), dark, 0, 1.33, -0.47);
  const sEyeL = part(new THREE.BoxGeometry(0.15, 0.22, 0.03), glow, -0.2, 1.4, -0.51);
  const sEyeR = sEyeL.clone(); sEyeR.position.x = 0.2;
  const sMouth = part(new THREE.BoxGeometry(0.3, 0.05, 0.03), glow, 0, 1.2, -0.51);
  const bulb = part(new THREE.SphereGeometry(0.1, 16, 12), gold, 0, 0.42, 0);
  const antenna = new THREE.Group();
  antenna.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.4), glow, 0, 0.2, 0), bulb);
  antenna.position.set(0, 1.82, 0);
  const limb = (x: number, y: number, w: number, h: number) => { const g = new THREE.BoxGeometry(w, h, w); g.translate(0, -h / 2, 0); const o = new THREE.Mesh(g, glow); o.position.set(x, y, 0); return o; };
  const sLegL = limb(-0.28, 0.8, 0.28, 0.8), sLegR = limb(0.28, 0.8, 0.28, 0.8), sArmL = limb(-0.7, 1.6, 0.2, 0.6), sArmR = limb(0.7, 1.6, 0.2, 0.6);
  simple.add(sBody, sScreen, sEyeL, sEyeR, sMouth, antenna, sLegL, sLegR, sArmL, sArmR);
  body.add(simple);

  // Partes que se animan (apuntan a la versión sencilla o, cuando carga, al modelo)
  let legL: THREE.Object3D = sLegL, legR: THREE.Object3D = sLegR, armL: THREE.Object3D = sArmL, armR: THREE.Object3D = sArmR;
  let lids: THREE.Mesh | null = null;
  let modelBase: THREE.Group | null = null;

  // ---------- Modelo generado: se parte en cuerpo, brazos y piernas para poder moverlos
  void (async () => {
    try {
      const head = await fetch("/models/vectorcito.glb", { method: "HEAD" });
      if (!head.ok || (head.headers.get("content-type") ?? "").includes("html")) { hero.visible = true; return; }
      const gltf = await new GLTFLoader().loadAsync("/models/vectorcito.glb");
      let mesh: THREE.Mesh | undefined;
      gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !mesh) mesh = o as THREE.Mesh; });
      if (!mesh || !mesh.geometry.index) return;
      useModel(mesh);
    } catch { /* sin modelo: se queda el personaje sencillo */ }
    hero.visible = true;
  })();

  function useModel(mesh: THREE.Mesh) {
    const geo = mesh.geometry, pos = geo.attributes.position, idx = geo.index!.array;
    const buckets: Record<string, number[]> = { body: [], legL: [], legR: [], armL: [], armR: [] };
    // Cada triángulo va a una parte según dónde está (medidas del modelo original)
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      const side = x < 0 ? "L" : "R";
      if (y < -0.8) buckets["leg" + side].push(a, b, c);
      else if (Math.abs(x) > 0.7 && y > -0.45 && y < 0.22) buckets["arm" + side].push(a, b, c);
      else buckets.body.push(a, b, c);
    }
    const material = (mesh.material as THREE.MeshStandardMaterial).clone();
    material.emissive = new THREE.Color(0xffffff);
    material.emissiveMap = material.map;
    material.emissiveIntensity = 0.28; // un poco de brillo propio para que se vea "neón"
    material.roughness = 0.55; material.metalness = 0.05;
    hueable(material);

    const root = new THREE.Group();
    const pivot = (ids: number[], px: number, py: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", pos); g.setAttribute("normal", geo.attributes.normal); g.setAttribute("uv", geo.attributes.uv);
      g.setIndex(ids);
      const m = new THREE.Mesh(g, material);
      m.position.set(-px, -py, 0);
      const grp = new THREE.Group();
      grp.position.set(px, py, 0);
      grp.add(m);
      root.add(grp);
      return grp;
    };
    const main = new THREE.Mesh((() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", pos); g.setAttribute("normal", geo.attributes.normal); g.setAttribute("uv", geo.attributes.uv); g.setIndex(buckets.body); return g; })(), material);
    root.add(main);
    const nLegL = pivot(buckets.legL, -0.3, -0.8), nLegR = pivot(buckets.legR, 0.3, -0.8);
    const nArmL = pivot(buckets.armL, -0.74, -0.1), nArmR = pivot(buckets.armR, 0.74, -0.1);

    // párpado: tapa los ojos un instante para parpadear
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshStandardMaterial({ color: 0x0c0e2e, roughness: 0.6 }));
    lid.position.set(0, -0.09, 0.42);
    lid.scale.y = 0.001;
    root.add(lid);

    root.scale.setScalar(S);
    root.position.y = 0.952 * S;
    root.rotation.y = Math.PI; // de espaldas a la cámara, como el personaje sencillo
    body.remove(simple);
    body.add(root);
    modelBase = root;
    legL = nLegL; legR = nLegR; armL = nArmL; armR = nArmR; lids = lid;
    anchors = MODEL;
    rebuildAccessories();
  }

  // ---------- Accesorios (todos empiezan ocultos; dress() muestra los puestos)
  const BLACK = mat(0x2a2a55), RED = mat(0xff7070), GOLD = mat(0xffc107, 0xffc107), PURPLE = mat(0x6a2bd9), BLUE = mat(0x2f6bff), WHITE = mat(0xf4f4ff), NEON = new THREE.MeshBasicMaterial({ color: 0x17ff93 });
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, open = false) => mesh(new THREE.CylinderGeometry(rt, rb, h, 22, 1, open), m);
  const box = (w: number, h: number, d: number, m: THREE.Material) => mesh(new THREE.BoxGeometry(w, h, d), m);
  const ball = (r: number, m: THREE.Material) => mesh(new THREE.SphereGeometry(r, 14, 10), m);
  const grp = (pos: [number, number, number], ...c: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...c); g.position.set(...pos); g.visible = false; return g; };
  const anim: Record<string, (t: number, speed: number) => void> = {};

  function rebuildAccessories() {
    for (const o of Object.values(accessories)) body.remove(o);
    accessories = {};
    const A = anchors;
    const set = (id: string, g: THREE.Group) => { g.scale.setScalar(A.sc); accessories[id] = g; body.add(g); };
    const head = (...c: THREE.Object3D[]) => grp([0, A.headTop, 0], ...c);
    const face = (...c: THREE.Object3D[]) => grp([0, A.faceY, A.faceZ], ...c);
    const sc = 1 / A.sc;

    // Cabeza
    set("party", head(at(mesh(new THREE.ConeGeometry(0.28, 0.6, 20), RED), 0, 0.3, 0), at(ball(0.08, GOLD), 0, 0.62, 0), at(cyl(0.285, 0.285, 0.05, GOLD), 0, 0.06, 0)));
    set("tophat", head(at(cyl(0.52, 0.52, 0.05, BLACK), 0, 0.03, 0), at(cyl(0.32, 0.32, 0.42, BLACK), 0, 0.25, 0), at(cyl(0.325, 0.325, 0.08, RED), 0, 0.1, 0)));
    set("crown", head(at(cyl(0.32, 0.32, 0.2, GOLD, true), 0, 0.1, 0), ...Array.from({ length: 5 }, (_, k) => at(mesh(new THREE.ConeGeometry(0.07, 0.24, 8), GOLD), Math.cos((k * 2 * Math.PI) / 5) * 0.28, 0.3, Math.sin((k * 2 * Math.PI) / 5) * 0.28))));
    set("wizard", head(at(mesh(new THREE.ConeGeometry(0.34, 0.85, 22), BLUE), 0, 0.42, 0), at(cyl(0.5, 0.5, 0.04, BLUE), 0, 0.02, 0), at(ball(0.06, GOLD), 0.1, 0.35, -0.3), at(ball(0.05, GOLD), -0.15, 0.55, -0.2), at(ball(0.04, GOLD), 0.05, 0.7, -0.1)));
    const halo = mesh(new THREE.TorusGeometry(0.34, 0.04, 10, 36).rotateX(Math.PI / 2), GOLD);
    set("halo", head(at(halo, 0, 0.55, 0)));
    anim.halo = (t) => { accessories.halo.children[0].position.y = 0.55 + Math.sin(t * 2.5) * 0.04; accessories.halo.rotation.y = t * 0.8; };
    const earY = A.faceY - A.headTop + 0.05, band = mesh(new THREE.TorusGeometry(1, 0.045 * sc, 8, 28, Math.PI), BLACK);
    band.position.y = earY * sc;
    band.scale.set((A.bodyW + 0.04) * sc, (A.headTop - A.faceY + 0.05) * sc * 1.0, 1);
    set("headphones", head(band, ...[-1, 1].map((s) => at(cyl(0.17 * sc, 0.17 * sc, 0.13 * sc, RED).rotateZ(Math.PI / 2), s * (A.bodyW + 0.05) * sc, earY * sc, 0))));

    // Cara (origen: centro de los ojos, sobre el frente de la pantalla)
    const lens = (m: THREE.Material, w: number, h: number) => [-1, 1].map((s) => at(mesh(new RoundedBoxGeometry(w, h, 0.04, 3, 0.04), m), s * A.eyeDX * sc, 0, -0.045));
    set("glasses", face(...[-1, 1].map((s) => at(mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24), BLACK), s * A.eyeDX * sc, 0, -0.03)), at(box(0.1, 0.03, 0.03, BLACK), 0, 0.02, -0.03)));
    set("shades", face(...lens(BLACK, 0.3, 0.2), at(box(0.12, 0.04, 0.04, BLACK), 0, 0.04, -0.045)));
    set("monocle", face(at(mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 24), GOLD), A.eyeDX * sc, 0, -0.03), at(box(0.012, 0.35, 0.012, GOLD), A.eyeDX * sc + 0.1, -0.2, -0.03)));
    set("visor", face(at(mesh(new RoundedBoxGeometry(A.eyeDX * 2 * sc + 0.4, 0.2, 0.05, 3, 0.05), NEON), 0, 0, -0.045)));

    // Cuerpo
    const bowPart = (s: number) => at(box(0.2, 0.14, 0.05, RED), s * 0.12, 0, 0);
    set("bow", grp([0, A.chestY, A.faceZ], bowPart(-1), bowPart(1), ball(0.06, RED)));
    accessories.bow.children[0].rotation.z = 0.25;
    accessories.bow.children[1].rotation.z = -0.25;
    const ring = mesh(new THREE.TorusGeometry(1, 0.09, 10, 32).rotateX(Math.PI / 2), mat(0xff5a4d));
    ring.scale.set((A.bodyW + 0.03) * sc, 1, (A.bodyD + 0.03) * sc);
    const tail = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.05).translate(0, -0.22, 0), mat(0xff5a4d));
    set("scarf", grp([0, A.chestY + 0.15, 0], ring, at(tail, (A.bodyW - 0.12) * sc, 0, -(A.bodyD + 0.02) * sc)));
    anim.scarf = (t, sp) => { accessories.scarf.children[1].rotation.x = 0.2 + Math.min(sp / 20, 0.6) + Math.sin(t * 8) * 0.08; };
    const cape = mesh(new THREE.BoxGeometry(A.bodyW * 1.8 * sc, 1.25, 0.04).translate(0, -0.62, 0), PURPLE);
    set("cape", grp([0, A.backTop, A.bodyD + 0.02], cape));
    anim.cape = (t, sp) => { cape.rotation.x = 0.12 + Math.min(sp / 18, 0.5) + Math.sin(t * 7) * 0.05; };
    // alas: dos plumas planas por lado, que se abren hacia afuera
    const wing = (s: number) => {
      const w = new THREE.Group();
      const feather = (len: number, tilt: number, y: number) => {
        const f = mesh(new THREE.SphereGeometry(1, 14, 8).scale(len, 0.13, 0.04).translate(s * len, 0, 0), WHITE);
        f.rotation.z = s * tilt; f.position.y = y;
        return f;
      };
      w.add(feather(0.6, 0.35, 0.1), feather(0.5, 0.05, -0.08), feather(0.38, -0.3, -0.24));
      w.position.set(s * 0.12, 0, 0);
      return w;
    };
    set("wings", grp([0, A.backTop - 0.35, A.bodyD + 0.05], wing(-1), wing(1)));
    anim.wings = (t) => { const f = Math.sin(t * 9) * 0.35; accessories.wings.children[0].rotation.set(0, f, 0); accessories.wings.children[1].rotation.set(0, -f, 0); };
    applyWorn();
  }
  function applyWorn() { for (const [id, o] of Object.entries(accessories)) o.visible = worn.includes(id); }
  rebuildAccessories();

  // ---------- Movimiento
  let blink = 2;
  let skinHue = 0;
  return {
    group: hero,
    /** Dónde salen las chispas. */
    headWorld(out: THREE.Vector3) { return out.set(hero.position.x, 1.8 + hero.position.y, 0); },
    /** Se pone lo que lleva el jugador. `hue` y `trail` los usa el que llama (cuerpo y estela). */
    dress(ids: string[]) {
      worn = ids;
      applyWorn();
      const skin = ids.map((id) => ITEMS.find((i) => i.id === id)).find((i) => i?.slot === "skin");
      skinHue = ((skin?.hue ?? 0) * Math.PI) / 180;
    },
    update(s: HeroState) {
      const swing = Math.sin(s.T * 1.6) * 0.8;
      const hasModel = !!modelBase;
      // piernas y brazos
      legL.rotation.x = swing * (hasModel ? 0.55 : 1);
      legR.rotation.x = -swing * (hasModel ? 0.55 : 1);
      armL.rotation.x = -swing * (hasModel ? 0.5 : 0.9);
      armR.rotation.x = swing * (hasModel ? 0.5 : 0.9);
      if (s.celebrate > 0) { const w = Math.sin(s.time * 18) * 0.4; armL.rotation.x = armR.rotation.x = -0.4 + w; }

      const air = Math.abs(Math.sin(s.jump * Math.PI)) * 1.6 + s.hop * 0.25;
      hero.position.y = air + (s.reduce ? 0 : Math.abs(Math.sin(s.T * 1.6)) * 0.08);
      // estirar al saltar, aplastar al caer
      const stretch = 1 + (s.jump > 0.5 ? 0.14 : s.jump > 0 ? -0.1 : 0) * Math.min(1, s.jump * 2);
      hero.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      hero.rotation.y = s.celebrate > 0 ? s.celebrate * Math.PI * 4 : 0;
      hero.position.x = (Math.random() - 0.5) * s.shake * 0.25;
      // inclinación: se echa hacia adelante al correr rápido y se balancea al pisar
      body.rotation.x = -Math.min(s.speed / 60, 0.22);
      body.rotation.z = s.reduce ? 0 : Math.sin(s.T * 1.6) * 0.04;

      // cara
      blink -= s.dt;
      const closed = blink < 0.12 && blink > 0;
      if (blink <= 0) blink = 2 + Math.random() * 2.5;
      if (lids) lids.scale.y = closed || s.sad > 0.5 ? 1 : 0.001;
      if (!hasModel) {
        antenna.rotation.z = Math.sin(s.time * 5) * 0.25 + swing * 0.15;
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(s.time * 6) * 0.3 + s.boost;
        sEyeL.scale.y = sEyeR.scale.y = closed ? 0.1 : s.sad > 0 ? 0.6 : 1;
        sMouth.scale.set(s.sad > 0 ? 0.6 : 1 + s.boost * 0.8, s.sad > 0 ? 1 : 1 + s.boost * 3, 1);
      }
      // destello rojo al fallar (el color verde gira hasta el rojo)
      HUE.value = skinHue + s.flash * -2.6;
      // accesorios con vida propia
      for (const id of worn) anim[id]?.(s.time, s.speed);
    },
  };
}
