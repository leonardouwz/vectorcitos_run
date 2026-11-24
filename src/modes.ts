import { LEVELS, type Lang, type Level } from "./content";

/** Fecha en UTC (AAAA-MM-DD): el reto diario es el mismo para todo el mundo. */
export const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const prevKey = (key: string) => dateKey(new Date(Date.parse(`${key}T00:00:00Z`) - 864e5));

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Las tres frases del día: una fácil, una media y una difícil. */
export function dailyLevels(key: string): Level[] {
  const r = rng(hash(key));
  return (["easy", "medium", "hard"] as const).map((d) => {
    const pool = LEVELS.filter((l) => l.diff === d);
    return pool[Math.floor(r() * pool.length)];
  });
}

/** Días seguidos: sigue si el último reto fue ayer, se mantiene si fue hoy y vuelve a 1 si se cortó. */
export const nextStreak = (last: string, today: string, streak: number) =>
  last === today ? streak : last === prevKey(today) ? streak + 1 : 1;

/** Frases sin fin para la contrarreloj: se mezclan y no se repiten hasta agotarlas. */
export function endlessTexts(lang: Lang, random = Math.random) {
  const pool = LEVELS.filter((l) => !l.free).map((l) => l.text[lang]);
  let bag: string[] = [];
  let last = "";
  return () => {
    if (!bag.length) {
      bag = pool.slice();
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag[bag.length - 1] === last) bag.unshift(bag.pop()!); // no repetir la última al reiniciar
    }
    last = bag.pop()!;
    return last;
  };
}
