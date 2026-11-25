// El ambiente 3D: cielo, sol o luna, suelo y decorado de cada dificultad.
// Todo avanza hacia la cámara a la velocidad de Vectorcito, que en realidad no se mueve.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FINGER_COLORS } from "./keys";

export type Theme = "menu" | "easy" | "medium" | "hard" | "practice";

interface Look {
  top: number; horizon: number;       // degradado del cielo
  accent: number;                     // líneas del suelo, luces de neón
  ground: number;                     // color del suelo
  sun: [number, number] | null;       // arriba y abajo del disco (null = sin sol)
  sunSize: number; sunY: number; stripes: boolean;
  fog: [number, number];
  stars: boolean; sea: boolean; mountains: boolean; towers: boolean; keycaps: boolean; clouds: boolean; aurora: boolean;
  towerColor: number; towerH: number;
}

const LOOKS: Record<Theme, Look> = {
  // Menú: noche de neón
  menu: { top: 0x050429, horizon: 0x101a5c, accent: 0x17ff93, ground: 0x050429, sun: [0x17ff93, 0x0b6b48], sunSize: 40, sunY: 14, stripes: true, fog: [25, 95], stars: true, sea: false, mountains: false, towers: true, keycaps: false, clouds: false, aurora: false, towerColor: 0x1a1a40, towerH: 1 },
  // Fácil: atardecer en el mar
  easy: { top: 0x1c1468, horizon: 0xff8a5c, accent: 0xffd36b, ground: 0x0e2a6b, sun: [0xfff0a0, 0xff7a45], sunSize: 56, sunY: 14, stripes: false, fog: [30, 120], stars: false, sea: true, mountains: false, towers: false, keycaps: false, clouds: true, aurora: false, towerColor: 0x1a1a40, towerH: 1 },
  // Intermedio: montañas nevadas y aurora
  medium: { top: 0x02031c, horizon: 0x0e3a6e, accent: 0x6ab7ff, ground: 0x08163a, sun: [0xf2f6ff, 0xaec8ff], sunSize: 22, sunY: 26, stripes: false, fog: [25, 110], stars: true, sea: false, mountains: true, towers: false, keycaps: false, clouds: false, aurora: true, towerColor: 0x1a1a40, towerH: 1 },
  // Difícil: ciudad de neón con sol rayado
  hard: { top: 0x0a0426, horizon: 0x6a0f58, accent: 0xff5fa8, ground: 0x0a0426, sun: [0xffd06b, 0xff2f7a], sunSize: 62, sunY: 20, stripes: true, fog: [25, 100], stars: true, sea: false, mountains: false, towers: true, keycaps: false, clouds: false, aurora: false, towerColor: 0x2a1048, towerH: 1.8 },
  // Práctica: espacio con teclas flotantes
  practice: { top: 0x040320, horizon: 0x0b3f55, accent: 0xa3ffa3, ground: 0x050429, sun: [0x9fd0ff, 0x3a6cc8], sunSize: 34, sunY: 22, stripes: false, fog: [30, 110], stars: true, sea: false, mountains: false, towers: false, keycaps: true, clouds: false, aurora: false, towerColor: 0x10264a, towerH: 1 },
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const colorspace = "#include <colorspace_fragment>";

export function createWorld(scene: THREE.Scene, opts: { low: boolean }) {
  const { low } = opts;
  const root = new THREE.Group();
  scene.add(root);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

  // ---- Cielo: esfera con degradado
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = clamp(normalize(vP).y * 1.7, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.65)), 1.0); 
${colorspace}
}`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(185, 24, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  root.add(sky);

  // ---- Sol o luna (con rayas estilo retro en el modo difícil)
  const sunMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color() }, b: { value: new THREE.Color() }, stripes: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float stripes; varying vec2 vUv;
      void main(){
        float d = length(vUv - 0.5) * 2.0; if (d > 1.0) discard;
        vec3 col = mix(b, a, smoothstep(0.0, 1.0, vUv.y));
        float alpha = 1.0;
        if (stripes > 0.5) { float band = step(0.5, fract(vUv.y * 13.0)); alpha = 1.0 - band * smoothstep(0.62, 0.0, vUv.y) * 0.95; }
        gl_FragColor = vec4(col, alpha * smoothstep(1.0, 0.97, d)); 
${colorspace}
}`,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sunMat);
  sun.position.z = -140;
  sun.renderOrder = -9;
  root.add(sun);

  // ---- Estrellas
  const starPos = new Float32Array(360 * 3).map((_, i) => (i % 3 === 1 ? 8 + Math.random() * 90 : (Math.random() - 0.5) * 300));
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, fog: false }));
  stars.position.z = -120;
  root.add(stars);

  // ---- Aurora (intermedio)
  const auroraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float time; varying vec2 vUv;
      void main(){
        float n = sin(vUv.x * 9.0 + time * 0.35) * 0.5 + sin(vUv.x * 21.0 - time * 0.25) * 0.3 + sin(vUv.x * 4.0 + time * 0.1) * 0.4;
        float c = smoothstep(0.22, 0.0, abs(vUv.y - 0.5 - n * 0.14));
        float fade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        vec3 col = mix(vec3(0.1, 1.0, 0.6), vec3(0.55, 0.3, 1.0), clamp(vUv.x + sin(time * 0.2) * 0.2, 0.0, 1.0));
        gl_FragColor = vec4(col, c * fade * 0.5); 
${colorspace}
}`,
  });
  const aurora = new THREE.Mesh(new THREE.PlaneGeometry(300, 80), auroraMat);
  aurora.position.set(0, 52, -125);
  aurora.renderOrder = -8;
  root.add(aurora);

  // ---- Suelo: rejilla o mar
  const grid = new THREE.GridHelper(180, 90, 0x17ff93, 0x17ff93);
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  (grid.material as THREE.LineBasicMaterial).opacity = 0.6;
  root.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshBasicMaterial({ color: 0x050429 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  root.add(floor);

  const SEG = low ? 36 : 64;
  const seaGeo = new THREE.PlaneGeometry(180, 180, SEG, SEG);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = Float32Array.from(seaGeo.attributes.position.array as Float32Array);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1c4fa8, emissive: 0x0a1d4a, flatShading: true, roughness: 0.3, metalness: 0.15 }));
  sea.position.y = -0.35;
  root.add(sea);

  // ---- Torres de neón (menú y difícil)
  const NT = low ? 22 : 36;
  const TSTEP = 4.5;
  const towerData = Array.from({ length: NT * 2 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: -(i >> 1) * TSTEP, w: rnd(1.6, 3.6), h: rnd(3, 12), x: rnd(7.5, 13) }));
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1a1a40, emissive: 0x0a0a35, roughness: 0.55 }), NT * 2);
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x17ff93 }), NT * 2);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x17ff93 }), NT * 2);
  towers.frustumCulled = strips.frustumCulled = caps.frustumCulled = false;
  const towerGroup = new THREE.Group();
  towerGroup.add(towers, strips, caps);
  root.add(towerGroup);
  let towerH = 1;

  // ---- Montañas nevadas (intermedio)
  const NM = low ? 10 : 16;
  const MSTEP = 11;
  const mountData = Array.from({ length: NM * 2 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: -(i >> 1) * MSTEP + rnd(-2, 2), w: rnd(9, 18), h: rnd(10, 26), x: rnd(24, 44), r: rnd(0, 3) }));
  const mountains = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5, 1), new THREE.MeshStandardMaterial({ color: 0x1c2f6b, roughness: 0.9, flatShading: true }), NM * 2);
  const snow = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5, 1), new THREE.MeshStandardMaterial({ color: 0xeaf2ff, roughness: 0.6, flatShading: true, emissive: 0x30406a }), NM * 2);
  mountains.frustumCulled = snow.frustumCulled = false;
  const mountGroup = new THREE.Group();
  mountGroup.add(mountains, snow);
  root.add(mountGroup);

  // ---- Islas de arena (fácil)
  const NI = low ? 6 : 10;
  const ISTEP = 17;
  const islandData = Array.from({ length: NI * 2 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: -(i >> 1) * ISTEP + rnd(-4, 4), w: rnd(5, 11), x: rnd(16, 34) }));
  const islands = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 6), new THREE.MeshStandardMaterial({ color: 0xf2c37b, roughness: 1, flatShading: true }), NI * 2);
  const grass = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 5), new THREE.MeshStandardMaterial({ color: 0x3fae6a, roughness: 1, flatShading: true }), NI * 2);
  islands.frustumCulled = grass.frustumCulled = false;
  const islandGroup = new THREE.Group();
  islandGroup.add(islands, grass);
  root.add(islandGroup);

  // ---- Nubes (fácil)
  const NC = low ? 8 : 14;
  const cloudData = Array.from({ length: NC }, () => ({ x: rnd(-70, 70), y: rnd(20, 36), z: rnd(-150, -30), s: rnd(3, 6) }));
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc9b0, fog: false, transparent: true, opacity: 0.85 }), NC * 4);
  clouds.frustumCulled = false;
  root.add(clouds);

  // ---- Teclas flotantes (práctica)
  const NK = low ? 22 : 40;
  const keyData = Array.from({ length: NK }, (_, i) => ({ x: (Math.random() < 0.5 ? -1 : 1) * rnd(5, 26), y: rnd(0.8, 15), z: rnd(-110, 8), r: rnd(0, 6), spin: rnd(-0.6, 0.6), s: rnd(0.9, 1.8), c: i % FINGER_COLORS.length }));
  const keycaps = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 0.7, 1, 3, 0.16), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }), NK);
  keycaps.frustumCulled = false;
  keyData.forEach((k, i) => keycaps.setColorAt(i, new THREE.Color(FINGER_COLORS[k.c])));
  root.add(keycaps);

  // ---- Líneas de velocidad (solo mientras se juega)
  const NL = low ? 20 : 44;
  const lineData = Array.from({ length: NL }, () => ({ x: (Math.random() < 0.5 ? -1 : 1) * rnd(2.5, 11), y: rnd(0.2, 7), z: rnd(-90, 10), l: rnd(2, 5) }));
  const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 1), new THREE.MeshBasicMaterial({ color: 0x17ff93, transparent: true, opacity: 0, fog: true }), NL);
  lines.frustumCulled = false;
  root.add(lines);

  let look = LOOKS.menu;
  let trailTint: THREE.Color | null = null; // estela de color (cosmético)

  function applyLook() {
    const c = new THREE.Color();
    skyMat.uniforms.top.value.set(look.top);
    skyMat.uniforms.horizon.value.set(look.horizon);
    (scene.fog as THREE.Fog).color.set(look.horizon);
    (scene.fog as THREE.Fog).near = look.fog[0];
    (scene.fog as THREE.Fog).far = look.fog[1];
    if (look.sun) {
      sun.visible = true;
      sunMat.uniforms.a.value.set(look.sun[0]);
      sunMat.uniforms.b.value.set(look.sun[1]);
      sunMat.uniforms.stripes.value = look.stripes ? 1 : 0;
      sun.scale.set(look.sunSize, look.sunSize, 1);
      sun.position.y = look.sunY;
    } else sun.visible = false;
    stars.visible = look.stars;
    aurora.visible = look.aurora;
    grid.visible = floor.visible = !look.sea;
    sea.visible = look.sea;
    (grid.material as THREE.LineBasicMaterial).color.copy(c.set(look.accent));
    (floor.material as THREE.MeshBasicMaterial).color.set(look.ground);
    towerGroup.visible = look.towers;
    mountGroup.visible = look.mountains;
    islandGroup.visible = look.sea;
    clouds.visible = look.clouds;
    keycaps.visible = look.keycaps;
    (towers.material as THREE.MeshStandardMaterial).color.set(look.towerColor);
    (strips.material as THREE.MeshBasicMaterial).color.set(look.accent);
    (caps.material as THREE.MeshBasicMaterial).color.set(look.accent);
    (lines.material as THREE.MeshBasicMaterial).color.set(trailTint ?? new THREE.Color(look.accent));
    towerH = look.towerH;
  }
  applyLook();

  return {
    get accent() { return look.accent; },
    /** Cambia de dificultad: cielo, sol, suelo y decorado. */
    setTheme(t: Theme) { look = LOOKS[t]; applyLook(); },
    /** Color de las líneas de velocidad según la estela que lleve el jugador (null = el de la dificultad). */
    setTrail(hex: number | null) { trailTint = hex === null ? null : new THREE.Color(hex); (lines.material as THREE.MeshBasicMaterial).color.set(trailTint ?? new THREE.Color(look.accent)); },
    /** `run`: distancia que avanza el mundo en este cuadro. */
    update(dt: number, run: number, time: number, speed: number, playing: boolean) {
      grid.position.z = (grid.position.z + run) % 2;

      if (look.sea) {
        const pos = seaGeo.attributes.position as THREE.BufferAttribute;
        const travelled = time * 3; // el oleaje avanza aunque se quede quieto el juego
        for (let i = 0; i < pos.count; i++) {
          const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
          pos.setY(i, Math.sin(x * 0.32 + time * 1.1) * 0.28 + Math.sin(z * 0.22 - time * 1.3 + x * 0.12) * 0.22 + Math.sin((z - travelled) * 0.1) * 0.15);
        }
        pos.needsUpdate = true;
        sea.position.z = (sea.position.z + run * 0.9) % 6;
        islandData.forEach((d) => { d.z += run; if (d.z > 14) d.z -= NI * ISTEP; });
        islandData.forEach((d, i) => {
          m4.compose(v3.set(d.side * d.x, -0.2, d.z), q.identity(), s3.set(d.w, d.w * 0.28, d.w));
          islands.setMatrixAt(i, m4);
          m4.compose(v3.set(d.side * d.x, d.w * 0.22, d.z), q.identity(), s3.set(d.w * 0.62, d.w * 0.2, d.w * 0.62));
          grass.setMatrixAt(i, m4);
        });
        islands.instanceMatrix.needsUpdate = grass.instanceMatrix.needsUpdate = true;
      }

      if (look.towers) {
        towerData.forEach((d) => { d.z += run; if (d.z > 10) d.z -= NT * TSTEP; });
        towerData.forEach((d, i) => {
          const h = d.h * towerH;
          const x = d.side * d.x;
          m4.compose(v3.set(x, h / 2, d.z), q.identity(), s3.set(d.w, h, d.w));
          towers.setMatrixAt(i, m4);
          // franja de neón en la esquina que mira a la pista y luz en la azotea
          m4.compose(v3.set(x - d.side * (d.w / 2 + 0.02), h / 2, d.z - d.w / 2 - 0.02), q.identity(), s3.set(0.08, h * 0.92, 0.08));
          strips.setMatrixAt(i, m4);
          m4.compose(v3.set(x, h + 0.06, d.z), q.identity(), s3.set(d.w + 0.1, 0.12, d.w + 0.1));
          caps.setMatrixAt(i, m4);
        });
        towers.instanceMatrix.needsUpdate = strips.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true;
      }

      if (look.mountains) {
        mountData.forEach((d) => { d.z += run; if (d.z > 30) d.z -= NM * MSTEP; });
        mountData.forEach((d, i) => {
          q.setFromEuler(e.set(0, d.r, 0));
          m4.compose(v3.set(d.side * d.x, d.h / 2 - 0.5, d.z), q, s3.set(d.w, d.h, d.w));
          mountains.setMatrixAt(i, m4);
          m4.compose(v3.set(d.side * d.x, d.h * 0.78 - 0.5, d.z), q, s3.set(d.w * 0.34, d.h * 0.36, d.w * 0.34));
          snow.setMatrixAt(i, m4);
        });
        mountains.instanceMatrix.needsUpdate = snow.instanceMatrix.needsUpdate = true;
        auroraMat.uniforms.time.value = time;
      }

      if (look.clouds) {
        cloudData.forEach((c, i) => {
          c.z += run * 0.12;
          if (c.z > -20) c.z = -150;
          for (let k = 0; k < 4; k++) {
            m4.compose(v3.set(c.x + (k - 1.5) * c.s * 0.9, c.y + (k % 2) * c.s * 0.25, c.z), q.identity(), s3.set(c.s * (1.1 - k * 0.12), c.s * 0.55, c.s * 0.6));
            clouds.setMatrixAt(i * 4 + k, m4);
          }
        });
        clouds.instanceMatrix.needsUpdate = true;
      }

      if (look.keycaps) {
        keyData.forEach((k, i) => {
          k.z += run;
          if (k.z > 10) k.z -= 120;
          k.r += k.spin * dt;
          q.setFromEuler(e.set(k.r * 0.6, k.r, k.r * 0.3));
          m4.compose(v3.set(k.x, k.y + Math.sin(time + i) * 0.3, k.z), q, s3.set(k.s, k.s, k.s));
          keycaps.setMatrixAt(i, m4);
        });
        keycaps.instanceMatrix.needsUpdate = true;
      }

      // Líneas de velocidad: aparecen al correr rápido
      const lineMat = lines.material as THREE.MeshBasicMaterial;
      const target = playing ? Math.min(0.75, Math.max(0, (speed - 6) / 14)) : 0;
      lineMat.opacity += (target - lineMat.opacity) * Math.min(1, dt * 4);
      lines.visible = lineMat.opacity > 0.02;
      if (lines.visible) {
        lineData.forEach((l, i) => {
          l.z += run * 2.6 + dt * 6;
          if (l.z > 12) { l.z = -90; l.x = (Math.random() < 0.5 ? -1 : 1) * rnd(2.5, 11); l.y = rnd(0.2, 7); }
          m4.compose(v3.set(l.x, l.y, l.z), q.identity(), s3.set(1, 1, l.l * (0.6 + speed / 14)));
          lines.setMatrixAt(i, m4);
        });
        lines.instanceMatrix.needsUpdate = true;
      }
      stars.rotation.y += dt * 0.008;
    },
  };
}
