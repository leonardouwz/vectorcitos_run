// CONCEPTO "Esquiva": las letras de la frase vienen corriendo hacia Vectorcito.
// Escribir bien la letra de al frente la esquiva (Vectorcito salta y la letra sale volando);
// si llega hasta él, lo golpea: cuenta como error y la fila retrocede un poco.
import * as THREE from "three";

const SIZE = 1.25;
const texCache = new Map<string, THREE.CanvasTexture>();

/** Cara de la letra: ficha oscura con borde de color. `hot` = la que hay que escribir ahora. */
function face(ch: string, hot: boolean) {
  const key = `${ch}|${hot ? 1 : 0}`;
  let tex = texCache.get(key);
  if (tex) return tex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  g.fillStyle = hot ? "#17ff93" : "#0c0e3a"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = hot ? "#ffffff" : "#17ff93"; g.lineWidth = hot ? 10 : 6; g.strokeRect(5, 5, 118, 118);
  g.fillStyle = hot ? "#050429" : "#d8fff0"; g.font = "700 84px 'Syne Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(ch === " " ? "␣" : ch, 64, 70);
  tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

interface Letter { ch: string; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial[]; gone: number; vx: number; vy: number }

export function createDodge(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const geo = new THREE.BoxGeometry(SIZE, SIZE, 0.3);
  const side = new THREE.MeshBasicMaterial({ color: 0x0c0e3a });
  let letters: Letter[] = [];
  let pos = 0, shown = 12, hot = -1;
  let hitFlash = 0;

  const clear = () => { for (const l of letters) { root.remove(l.mesh); l.mat.forEach((m) => m.dispose()); } letters = []; hot = -1; };
  const paint = (l: Letter, isHot: boolean) => { l.mat[4].map = face(l.ch, isHot); l.mat[4].needsUpdate = true; };

  return {
    /** Prepara las letras de una frase. */
    begin(text: string) {
      clear(); pos = 0; shown = 12;
      letters = [...text].map((ch) => {
        const front = new THREE.MeshBasicMaterial({ map: face(ch, false), transparent: true });
        const mat = [side, side, side, side, front, side].map((m, i) => (i === 4 ? m : m.clone()));
        mat.forEach((m) => { m.transparent = true; });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false; root.add(mesh);
        return { ch, mesh, mat, gone: 0, vx: 0, vy: 0 };
      });
    },
    /** `i`: letra que hay que escribir ahora; `front`: a qué distancia está de Vectorcito; `gap`: espacio entre letras. */
    set(i: number, front: number, gap: number, dt: number, time: number) {
      while (pos < i) { const l = letters[pos++]; l.gone = 0.0001; l.vx = (pos % 2 ? 1 : -1) * (3 + Math.random() * 2); l.vy = 4 + Math.random() * 2; } // esquivada: sale volando
      shown += (front - shown) * Math.min(1, dt * 10); // al retroceder tras un golpe, el movimiento es suave
      hitFlash = Math.max(0, hitFlash - dt * 3);
      letters.forEach((l, k) => {
        if (l.gone > 0) { // animación de salida
          l.gone += dt;
          l.mesh.position.x += l.vx * dt; l.mesh.position.y += l.vy * dt; l.vy -= 9 * dt;
          l.mesh.rotation.z += l.vx * dt * 2; l.mesh.rotation.x += dt * 4;
          const a = Math.max(0, 1 - l.gone * 1.8); l.mat.forEach((m) => (m.opacity = a));
          l.mesh.visible = a > 0;
          return;
        }
        if (k < i) return;
        const d = shown + (k - i) * gap;
        l.mesh.visible = d < 46;
        const first = k === i;
        l.mesh.position.set(first && hitFlash > 0 ? (Math.random() - 0.5) * 0.2 : 0, SIZE / 2 + 0.25 + (first ? Math.abs(Math.sin(time * 6)) * 0.12 : 0), -d);
        l.mesh.rotation.set(0, 0, 0);
        l.mat.forEach((m) => (m.opacity = Math.min(1, (46 - d) / 14)));
        if (first !== (hot === k)) { /* se repinta abajo */ }
      });
      if (hot !== i) { if (letters[hot]) paint(letters[hot], false); if (letters[i]) paint(letters[i], true); hot = i; }
    },
    /** Una letra alcanzó a Vectorcito. */
    hit() { hitFlash = 1; },
    end() { clear(); },
  };
}
