import { del, list, put } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";
import { boardPrefix, cleanRoom, entryPath, hashPid, parseEntry, sortEntries, validateSubmission, type BoardName, type Entry } from "./_rank";

const BOARD_CAP = 1000; // jugadores por tabla
const TOP = 20;

const json = (data: unknown, status = 200, cache = "no-store") => Response.json(data, { status, headers: { "Cache-Control": cache } });

async function names(prefix: string, max = BOARD_CAP) {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < max);
  return out;
}

/** Guarda la marca solo si mejora la anterior del mismo jugador. Devuelve su puesto. */
async function upsert(prefix: string, entry: Entry) {
  const all = await names(prefix);
  const mineName = all.find((n) => parseEntry(n)?.id === entry.id);
  const old = mineName ? parseEntry(mineName) : null;
  let current = old ?? entry;
  let improved = false;
  const full = all.length >= BOARD_CAP && !old && entry.score <= Math.min(...all.map((n) => parseEntry(n)?.score ?? 0));
  if (!full && (!old || entry.score > old.score)) {
    await put(entryPath(prefix, entry), "1", { access: "private", contentType: "text/plain", addRandomSuffix: false, allowOverwrite: true });
    if (mineName) await del(mineName);
    current = entry;
    improved = true;
  }
  const rows = sortEntries([...all.map((n) => parseEntry(n)).filter((e): e is Entry => !!e && e.id !== entry.id), ...(full ? [] : [current])]);
  const rank = rows.findIndex((e) => e.id === entry.id) + 1;
  return { rank: rank || null, total: rows.length, improved, best: current.score };
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2000) return json({ error: "too_long" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid" }, 400); }
  // Borrar todas las marcas de un jugador: solo con su código privado.
  const b = body as { forget?: unknown; pid?: unknown } | null;
  if (b && b.forget === true && typeof b.pid === "string" && b.pid.length >= 16 && b.pid.length <= 64) {
    const id = hashPid(b.pid);
    const hits = (await names("rank/", 20000)).filter((n) => parseEntry(n)?.id === id);
    if (hits.length) await del(hits);
    return json({ removed: hits.length });
  }
  const checked = validateSubmission(body);
  if (!checked.ok) return checked.spam ? json({ ok: true }, 201) : json({ error: checked.error }, 400);
  const { board, room, entry } = checked.value;

  const global = await upsert(boardPrefix(board, ""), entry);
  const inRoom = room ? await upsert(boardPrefix(board, room), entry) : null;
  return json({ ok: true, global, room: inRoom }, 201);
}

function isAdmin(key: string | null) {
  const k = process.env.ADMIN_KEY;
  if (!k || !key) return false;
  const a = Buffer.from(key), b = Buffer.from(k);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Moderación: /api/rank?remove=ID&key=CLAVE borra a ese jugador de todas las tablas.
  const remove = url.searchParams.get("remove");
  if (remove) {
    if (!isAdmin(url.searchParams.get("key"))) return json({ error: "unauthorized" }, 401);
    const hits = (await names("rank/", 20000)).filter((n) => parseEntry(n)?.id === remove);
    if (hits.length) await del(hits);
    return json({ removed: hits.length });
  }

  const board = url.searchParams.get("board") as BoardName;
  if (board !== "daily" && board !== "time") return json({ error: "invalid" }, 400);
  const room = cleanRoom(url.searchParams.get("room"));
  const rows = sortEntries((await names(boardPrefix(board, room))).map(parseEntry).filter((e): e is Entry => !!e));
  const me = url.searchParams.get("me") ?? "";
  const mine = me ? rows.findIndex((e) => e.id === me) : -1;
  const view = (e: Entry, i: number) => ({ rank: i + 1, id: e.id, nick: e.nick, score: e.score, wpm: e.wpm, acc: e.acc, stars: e.stars });
  return json(
    { board, room, total: rows.length, top: rows.slice(0, TOP).map(view), me: mine >= 0 ? view(rows[mine], mine) : null },
    200,
    me ? "no-store" : "public, s-maxage=10, stale-while-revalidate=30",
  );
}
