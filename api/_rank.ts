import { createHash } from "node:crypto";

export type BoardName = "daily" | "time";
export interface Entry { id: string; nick: string; score: number; wpm: number; acc: number; stars: number }

/** Apodo visible: letras, números, espacio, punto, guion y guion bajo; máximo 16. */
export const cleanNick = (s: unknown) =>
  typeof s === "string" ? s.replace(/[^\p{L}\p{N}_ .-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16) : "";
/** Código de sala: 3 a 12 letras o números, en mayúsculas. Vacío si no hay sala. */
export const cleanRoom = (s: unknown) => {
  const r = typeof s === "string" ? s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "";
  return r.length >= 3 ? r : "";
};
/** Identificador público (no secreto) derivado del código privado del jugador. */
export const hashPid = (pid: string) => createHash("sha256").update(pid).digest("hex").slice(0, 12);
export const today = () => new Date().toISOString().slice(0, 10);

export function boardPrefix(board: BoardName, room: string, day = today()) {
  return `rank/${room ? `room-${room}/` : ""}${board === "daily" ? `daily-${day}` : "time"}/`;
}

const PAD = 9;
/** Todo el dato vive en el nombre del archivo: así se lee el ranking sin abrir cada uno. */
export const entryPath = (prefix: string, e: Entry) =>
  `${prefix}${String(10 ** PAD - 1 - e.score).padStart(PAD, "0")}~${e.id}~${encodeURIComponent(e.nick)}~${e.wpm}~${e.acc}~${e.stars}`;

export function parseEntry(pathname: string): Entry | null {
  const [inv, id, nick, wpm, acc, stars] = (pathname.split("/").pop() ?? "").split("~");
  const n = [inv, wpm, acc, stars].map(Number);
  if (!id || nick === undefined || n.some((x) => !Number.isInteger(x))) return null;
  let name: string;
  try { name = decodeURIComponent(nick); } catch { return null; }
  return { id, nick: name, score: 10 ** PAD - 1 - n[0], wpm: n[1], acc: n[2], stars: n[3] };
}

export const sortEntries = (a: Entry[]) => a.slice().sort((x, y) => y.score - x.score || y.wpm - x.wpm || x.id.localeCompare(y.id));

export interface Submission { pid: string; nick: string; board: BoardName; room: string; entry: Entry }
export type Checked = { ok: true; value: Submission } | { ok: false; error: string; spam?: boolean };

export function validateSubmission(body: unknown): Checked {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid" };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { ok: false, error: "spam", spam: true };
  const int = (v: unknown, lo: number, hi: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
  const pid = typeof b.pid === "string" && b.pid.length >= 16 && b.pid.length <= 64 ? b.pid : "";
  const nick = cleanNick(b.nick);
  const board = b.board === "daily" || b.board === "time" ? b.board : null;
  const wpm = int(b.wpm, 1, 220), acc = int(b.acc, 0, 100), stars = int(b.stars, 1, 3);
  const score = int(b.score, 1, 12000);
  if (!pid || !nick || !board || wpm === null || acc === null || stars === null || score === null) return { ok: false, error: "invalid" };
  // Comprobaciones de sentido común: no detienen a quien quiera hacer trampa, pero descartan datos absurdos.
  if (board === "daily" && Math.abs(score - Math.round((wpm * acc) / 100)) > 1) return { ok: false, error: "invalid" };
  if (board === "time" && score > wpm * 50 + 50) return { ok: false, error: "invalid" };
  return { ok: true, value: { pid, nick, board, room: cleanRoom(b.room), entry: { id: hashPid(pid), nick, score, wpm, acc, stars } } };
}
