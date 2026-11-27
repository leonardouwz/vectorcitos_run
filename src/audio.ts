// Sonido generado en vivo: no hace falta ningún archivo. Para usar tus propios
// sonidos o música, mira el README (sección "Ampliar el juego").
let ctx: AudioContext | null = null;
let master: GainNode;
let bus: GainNode; // volumen de la música: un solo control, así silenciar/activar nunca se desincroniza
let noise: AudioBuffer;
let muted = false;
let musicOn = true;
const MUSIC_VOL = 0.55;
const busTarget = () => (muted || !musicOn ? 0 : MUSIC_VOL);
const applyBus = () => { if (ctx && bus) { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(busTarget(), ctx.currentTime, 0.05); } };

function ensure() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    bus = ctx.createGain();
    bus.gain.value = busTarget();
    bus.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.12, delay = 0, slideTo?: number) {
  if (muted) return;
  const c = ensure();
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function hat(vol = 0.05) {
  if (muted) return;
  const c = ensure();
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noise;
  f.type = "highpass";
  f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
  s.connect(f).connect(g).connect(master);
  s.start();
  s.stop(c.currentTime + 0.06);
}

export const sfx = {
  /** El tono sube con la racha de letras bien escritas, hasta una octava. */
  key: (streak = 0) => tone(520 * 2 ** (Math.min(streak, 24) / 24), 0.05, "square", 0.05),
  word: () => { tone(880, 0.09, "square", 0.08); tone(1320, 0.12, "square", 0.06, 0.06); },
  error: () => tone(180, 0.2, "sawtooth", 0.11, 0, 70),
  click: () => tone(520, 0.06, "triangle", 0.1),
  tick: (i: number) => tone(440 * 2 ** (i / 12), 0.12, "square", 0.09),
  go: () => { tone(880, 0.3, "square", 0.1); tone(1320, 0.3, "triangle", 0.1, 0.02); },
  star: (i: number) => tone(660 * 2 ** (i * 4 / 12), 0.35, "triangle", 0.16),
  fanfare: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, i * 0.09)),
};

// Música: arpegio sobre un bajo, con más ritmo según la dificultad.
const MOODS = {
  menu:   { root: 98,  ms: 300, beat: false },
  easy:   { root: 110, ms: 240, beat: true },
  medium: { root: 123, ms: 210, beat: true },
  hard:   { root: 131, ms: 180, beat: true },
  practice: { root: 104, ms: 270, beat: false },
};
export type Mood = keyof typeof MOODS;
const SCALE = [0, 3, 5, 7, 10, 12, 15];
let mood = MOODS.menu;
let musicTimer = 0;
let step = 0;

function beat() {
  if (!musicOn) return;
  const s = step++;
  const bass = [0, 0, 5, 3][Math.floor(s / 8) % 4];
  if (s % 8 === 0) tone(mood.root * 2 ** (bass / 12), 0.9, "sine", 0.16);
  const n = SCALE[(s * 3 + (s >> 2)) % SCALE.length];
  if (s % 2 === 0) tone(mood.root * 4 * 2 ** ((n + bass) / 12), 0.2, "triangle", 0.045);
  if (mood.beat) {
    if (s % 4 === 0) tone(150, 0.14, "sine", 0.2, 0, 40);
    if (s % 2 === 1) hat();
  }
}

// Música real (public/audio/*.mp3, generada con IA): bucle con fundido entre pistas.
// Si un archivo no carga, suena el arpegio generado de arriba.
const tracks: Partial<Record<Mood, AudioBuffer>> = {};
const loading: Partial<Record<Mood, Promise<void>>> = {};
let cur: { src: AudioBufferSourceNode; g: GainNode } | null = null;
let want: Mood = "menu";
let playing = false;

function load(name: Mood) {
  return (loading[name] ??= fetch(`/audio/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then((b) => ensure().decodeAudioData(b))
    .then((buf) => { tracks[name] = buf; })
    .catch(() => { delete loading[name]; }));
}

function fadeTo(name: Mood) {
  const c = ensure(), buf = tracks[name];
  if (!buf) return false;
  const t = c.currentTime;
  if (cur) { cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + 1.2); const old = cur.src; setTimeout(() => old.stop(), 1400); }
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.loop = true;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2);
  src.connect(g).connect(bus); src.start();
  cur = { src, g };
  return true;
}

function stopFile() {
  if (!cur) return;
  const { src, g } = cur; cur = null;
  g.gain.setTargetAtTime(0, ensure().currentTime, 0.15);
  setTimeout(() => src.stop(), 800);
}

function begin() {
  playing = true;
  const name = want;
  void load(name).then(() => {
    if (!playing || want !== name) return;
    if (tracks[name]) { if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; } fadeTo(name); }
  });
  if (!tracks[name] && !musicTimer) musicTimer = window.setInterval(beat, mood.ms); // mientras carga
}

export const music = {
  start() { ensure(); if (!playing) begin(); },
  stop() { playing = false; clearInterval(musicTimer); musicTimer = 0; stopFile(); },
  mood(name: Mood) {
    if (name === want) return; // misma música: que siga sonando sin cortes
    want = name; mood = MOODS[name];
    if (playing) { stopFile(); begin(); }
  },
};

export function setMuted(m: boolean) { muted = m; applyBus(); }
export function setMusicOn(on: boolean) { musicOn = on; applyBus(); }
export const unlockAudio = () => { ensure(); };

// Al volver a la pestaña o a la app, el navegador puede haber pausado el audio: se reanuda.
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx?.state === "suspended") void ctx.resume(); });
