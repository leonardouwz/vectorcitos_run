// Sonido generado en vivo: no hace falta ningún archivo. Para usar tus propios
// sonidos o música, mira el README (sección "Añadir música y sonidos").
let ctx: AudioContext | null = null;
let master: GainNode;
let musicTimer = 0;
let muted = false;

function ensure() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.12, delay = 0) {
  const c = ensure();
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  key: () => tone(660 + Math.random() * 60, 0.05, "square", 0.05),
  word: () => { tone(880, 0.09, "square", 0.1); tone(1320, 0.12, "square", 0.08, 0.06); },
  error: () => tone(120, 0.18, "sawtooth", 0.12),
  click: () => tone(520, 0.06, "triangle", 0.1),
  win: (stars: number) => [523, 659, 784, 1047].slice(0, stars + 1).forEach((f, i) => tone(f, 0.25, "triangle", 0.14, i * 0.12)),
};

// Música: arpegio en escala pentatónica menor sobre un bajo lento.
const SCALE = [0, 3, 5, 7, 10, 12, 15];
export const music = {
  start() {
    if (musicTimer) return;
    const c = ensure();
    let step = 0;
    const root = 110;
    musicTimer = window.setInterval(() => {
      if (c.state !== "running") return;
      const s = step++;
      const bass = [0, 0, 5, 3][Math.floor(s / 8) % 4];
      if (s % 8 === 0) tone(root * 2 ** (bass / 12), 0.9, "sine", 0.16);
      const n = SCALE[(s * 3 + (s >> 2)) % SCALE.length];
      if (s % 2 === 0) tone(root * 4 * 2 ** ((n + bass) / 12), 0.2, "triangle", 0.045);
    }, 240);
  },
  stop() { clearInterval(musicTimer); musicTimer = 0; },
};

export function setMuted(m: boolean) {
  muted = m;
  if (ctx) master.gain.value = m ? 0 : 0.5;
}
export const unlockAudio = () => { ensure(); };
