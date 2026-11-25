import { LEVELS } from "./content";

/** Reto a un amigo: viaja dentro del enlace (#reto=...), sin servidor ni cuentas. */
export interface Challenge { kind: "level" | "time"; id: number; nick: string; wpm: number; acc: number; score: number }

const cleanNick = (s: string) => s.replace(/[^\p{L}\p{N}_ .-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);

/** Puntaje para comparar: palabras por minuto ajustadas por precisión (nivel) o puntos (contrarreloj). */
export const compareScore = (kind: Challenge["kind"], wpm: number, acc: number, points: number) => (kind === "time" ? points : Math.round((wpm * acc) / 100));

export const encode = (c: Challenge, origin: string) =>
  `${origin}/#reto=${c.kind}.${c.id}.${c.wpm}.${c.acc}.${c.score}.${encodeURIComponent(c.nick)}`;

export function decode(hash: string): Challenge | null {
  const m = /^#reto=(level|time)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(.*)$/.exec(hash);
  if (!m) return null;
  const [kind, id, wpm, acc, score] = [m[1] as Challenge["kind"], +m[2], +m[3], +m[4], +m[5]];
  let nick = "";
  try { nick = cleanNick(decodeURIComponent(m[6])); } catch { return null; }
  if (!nick || wpm < 1 || wpm > 220 || acc > 100 || score < 1 || score > 12000) return null;
  if (kind === "level" && !LEVELS.some((l) => l.id === id)) return null;
  return { kind, id: kind === "time" ? 0 : id, nick, wpm, acc, score };
}

export const verdict = (mine: number, theirs: number) => (mine > theirs ? "win" : mine < theirs ? "lose" : "tie");
