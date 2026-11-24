import { store } from "./store";

export interface Row { rank: number; id: string; nick: string; score: number; wpm: number; acc: number; stars: number }
export interface Board { total: number; top: Row[]; me: Row | null }
export interface Place { rank: number | null; total: number; improved: boolean }

/** Identificador público: mismo cálculo que hace el servidor con el código privado. */
export async function idOf(pid: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pid));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

const post = (body: object) => fetch("/api/rank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Envía una marca si el jugador activó el ranking. No molesta si falla: el juego sigue igual. */
export async function submit(board: "daily" | "time", score: number, wpm: number, acc: number, stars: number) {
  const o = store.online;
  if (!o.on || wpm < 1 || wpm > 220) return null;
  try {
    const res = await post({ pid: o.pid, nick: store.current, board, room: o.room, score, wpm, acc, stars });
    if (!res.ok) return null;
    return (await res.json()) as { global: Place; room: Place | null };
  } catch { return null; }
}

export async function fetchBoard(board: "daily" | "time", room: string): Promise<Board> {
  const q = new URLSearchParams({ board, me: await idOf(store.online.pid) });
  if (room) q.set("room", room);
  const res = await fetch(`/api/rank?${q}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function forget() {
  const res = await post({ pid: store.online.pid, forget: true });
  if (!res.ok) throw new Error(String(res.status));
}
