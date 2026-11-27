// CONCEPTO "Esquiva": las letras de la frase vienen corriendo hacia Vectorcito, repartidas por todo el camino.
// Vectorcito corre hacia el carril de la letra de al frente; escribirla bien la corta en dos (tajo) y la esquiva.
// Si la letra lo alcanza, lo golpea: cuenta como error y la fila retrocede un poco.
import * as THREE from "three";

const SIZE = 2.1;
const Z = new THREE.Vector3(0, 0, 1);
const texCache = new Map<string, THREE.CanvasTexture>();

/** Cara de la letra: ficha oscura con borde de color. `hot` = la que hay que escribir ahora. */
function face(ch: string, hot: boolean) {
  const key = `${ch}|${hot ? 1 : 0}`;
  let tex = texCache.get(key);
  if (tex) return tex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  const g = cv.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 160, 160);
  if (hot) { grad.addColorStop(0, "#5dffb4"); grad.addColorStop(1, "#17ff93"); } else { grad.addColorStop(0, "#1a1f6b"); grad.addColorStop(1, "#0c0e3a"); }
  g.fillStyle = grad; g.fillRect(0, 0, 160, 160);
  g.strokeStyle = hot ? "#ffffff" : "#17ff93"; g.lineWidth = hot ? 12 : 8; g.strokeRect(6, 6, 148, 148);
  g.fillStyle = hot ? "#050429" : "#e8fff6"; g.font = "700 112px 'Syne Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(ch === " " ? "␣" : ch, 80, 88);
  tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/** Carril (x) y altura (y) de cada letra: reparto repetible, sin dos seguidas en el mismo sitio. */
export function lane(k: number) {
  const h = Math.sin(k * 12.9898 + 4.1) * 43758.5453, r1 = h - Math.floor(h);
  const g = Math.sin(k * 78.233 + 1.7) * 24634.6345, r2 = g - Math.floor(g);
  const side = [-1, 1, 0][k % 3]; // rota izquierda / derecha / centro para que se note el zigzag
  return { x: side * (2.2 + r1 * 1.6) + (side === 0 ? (r1 - 0.5) * 1.2 : 0), y: SIZE / 2 + 0.2 + r2 * 1.6 };
}

interface Letter { ch: string; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial[]; x: number; y: number }
interface Slice { a: THREE.Mesh; b: THREE.Mesh; pa: THREE.Plane; pb: THREE.Plane; c: THREE.Vector3; n: THREE.Vector3; age: number; line: THREE.Mesh; spin: number }

export function createDodge(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const geo = new THREE.BoxGeometry(SIZE, SIZE, 0.5);
  const side = new THREE.MeshBasicMaterial({ color: 0x0c0e3a });
  const slashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  const slashGeo = new THREE.PlaneGeometry(SIZE * 2.6, 0.12);
  let letters: Letter[] = [];
  let slices: Slice[] = [];
  let pos = 0, shown = 12, hot = -1, hitFlash = 0;
  let targetX = 0;

  const clear = () => {
    for (const l of letters) { root.remove(l.mesh); l.mat.forEach((m) => m.dispose()); }
    for (const s of slices) { root.remove(s.a, s.b, s.line); (s.a.material as THREE.Material[]).forEach((m) => m.dispose()); (s.b.material as THREE.Material[]).forEach((m) => m.dispose()); }
    letters = []; slices = []; hot = -1;
  };
  const paint = (l: Letter, isHot: boolean) => { l.mat[4].map = face(l.ch, isHot); l.mat[4].needsUpdate = true; };

  /** Corta la letra por una diagonal: dos mitades que se separan, giran y caen. */
  function slash(l: Letter) {
    const ang = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5); // inclinación del tajo
    const n = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).normalize(); // perpendicular al tajo
    const c = l.mesh.position.clone();
    const half = (sign: number) => {
      const mats = l.mat.map((m) => { const k = m.clone(); k.transparent = true; return k; });
      const plane = new THREE.Plane(n.clone().multiplyScalar(sign), -n.dot(c) * sign);
      mats.forEach((m) => { m.clippingPlanes = [plane]; });
      const mesh = new THREE.Mesh(geo, mats); mesh.position.copy(c);
      root.add(mesh);
      return { mesh, plane };
    };
    const A = half(1), B = half(-1);
    const line = new THREE.Mesh(slashGeo, slashMat.clone()); line.position.copy(c); line.position.z += 0.4; line.rotation.z = ang + Math.PI / 2; root.add(line);
    slices.push({ a: A.mesh, b: B.mesh, pa: A.plane, pb: B.plane, c, n, age: 0, line, spin: 1 + Math.random() * 2 });
    l.mesh.visible = false;
  }

  return {
    /** Prepara las letras de una frase. */
    begin(text: string) {
      clear(); pos = 0; shown = 12;
      letters = [...text].map((ch, k) => {
        const front = new THREE.MeshBasicMaterial({ map: face(ch, false), transparent: true });
        const mat = [side, side, side, side, front, side].map((m, i) => (i === 4 ? m : m.clone()));
        mat.forEach((m) => { m.transparent = true; });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false; root.add(mesh);
        return { ch, mesh, mat, ...(({ x, y }) => ({ x, y }))(lane(k)) };
      });
    },
    /** Carril de la letra de al frente: hacia ahí corre Vectorcito. */
    get targetX() { return targetX; },
    /** `i`: letra que hay que escribir ahora; `front`: a qué distancia está; `gap`: espacio entre letras. */
    set(i: number, front: number, gap: number, dt: number, time: number) {
      while (pos < i) slash(letters[pos++]); // esquivada: se corta en dos
      shown += (front - shown) * Math.min(1, dt * 10); // al retroceder tras un golpe, el movimiento es suave
      hitFlash = Math.max(0, hitFlash - dt * 3);
      targetX = letters[i]?.x ?? 0;
      letters.forEach((l, k) => {
        if (k < i) return;
        const d = shown + (k - i) * gap;
        l.mesh.visible = d < 40;
        const first = k === i;
        l.mesh.position.set(l.x + (first && hitFlash > 0 ? (Math.random() - 0.5) * 0.3 : 0), l.y + Math.sin(time * 2 + k) * 0.12 + (first ? Math.abs(Math.sin(time * 6)) * 0.12 : 0), -d);
        l.mesh.rotation.set(0, Math.sin(time * 1.5 + k) * 0.25, Math.sin(time + k * 2) * 0.06);
        l.mat.forEach((m) => (m.opacity = Math.min(1, (40 - d) / 14)));
      });
      if (hot !== i) { if (letters[hot]) paint(letters[hot], false); if (letters[i]) paint(letters[i], true); hot = i; }
      // mitades cortadas: se separan, giran y caen (el plano de corte viaja con cada mitad)
      slices = slices.filter((s) => {
        s.age += dt;
        const k = s.age, out = 3.2 * k;
        for (const [m, p, sign] of [[s.a, s.pa, 1], [s.b, s.pb, -1]] as const) {
          const off = s.n.clone().multiplyScalar(sign * out);
          m.position.copy(s.c).add(off); m.position.y -= 4 * k * k; m.position.z += 1.5 * k;
          m.rotation.z = sign * s.spin * k;
          // el corte pasa siempre por el centro de la letra y gira con ella
          p.normal.copy(s.n).applyAxisAngle(Z, m.rotation.z).multiplyScalar(sign);
          p.constant = -p.normal.dot(m.position);
          (m.material as THREE.MeshBasicMaterial[]).forEach((mat) => (mat.opacity = Math.max(0, 1 - k * 1.3)));
        }
        (s.line.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k * 7);
        const alive = k < 0.8;
        if (!alive) { root.remove(s.a, s.b, s.line); (s.a.material as THREE.Material[]).forEach((x) => x.dispose()); (s.b.material as THREE.Material[]).forEach((x) => x.dispose()); (s.line.material as THREE.Material).dispose(); }
        return alive;
      });
    },
    /** Una letra alcanzó a Vectorcito. */
    hit() { hitFlash = 1; },
    end() { clear(); },
  };
}
