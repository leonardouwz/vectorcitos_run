import { beforeEach, expect, test, vi } from "vitest";

const store = new Set<string>();
vi.mock("@vercel/blob", () => ({
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...store].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })), hasMore: false }),
  put: async (name: string) => { store.add(name); return {}; },
  del: async (n: string | string[]) => { for (const x of [n].flat()) store.delete(x); },
}));

import { GET, POST } from "./rank";
import { boardPrefix, cleanNick, cleanRoom, entryPath, hashPid, parseEntry, validateSubmission } from "./_rank";

const PID_A = "a".repeat(32), PID_B = "b".repeat(32);
const send = (b: object) => POST(new Request("https://x/api/rank", { method: "POST", body: JSON.stringify(b) }));
const daily = (pid: string, nick: string, wpm: number, acc: number, room = "") => ({ pid, nick, board: "daily", wpm, acc, stars: 3, score: Math.round((wpm * acc) / 100), room });
const top = async (q: string) => (await GET(new Request(`https://x/api/rank?${q}`))).json();
beforeEach(() => store.clear());

test("apodo, sala y ruta de cada marca", () => {
  expect(cleanNick("  Ana   <b>María</b>/x  ")).toBe("Ana bMaríabx");
  expect(cleanRoom("ab")).toBe("");
  expect(cleanRoom("aula-5b!")).toBe("AULA5B");
  const e = { id: hashPid(PID_A), nick: "Ana María", score: 87, wpm: 90, acc: 97, stars: 3 };
  expect(parseEntry(entryPath(boardPrefix("time", ""), e))).toEqual(e);
  expect(parseEntry("rank/time/basura")).toBeNull();
});

test("rechaza datos absurdos y bots", () => {
  expect(validateSubmission({ ...daily(PID_A, "Ana", 500, 100), wpm: 500 })).toMatchObject({ ok: false });
  expect(validateSubmission({ ...daily(PID_A, "Ana", 80, 100), score: 999 })).toMatchObject({ ok: false });
  expect(validateSubmission({ ...daily(PID_A, "Ana", 80, 100), board: "time", score: 9000 })).toMatchObject({ ok: false });
  expect(validateSubmission({ ...daily("corto", "Ana", 80, 100) })).toMatchObject({ ok: false });
  expect(validateSubmission({ ...daily(PID_A, "Ana", 80, 100), website: "x" })).toMatchObject({ spam: true });
});

test("ranking: ordena, solo guarda mejoras y separa salas", async () => {
  expect((await (await send(daily(PID_A, "Ana", 80, 95, "aula5b"))).json()).global).toMatchObject({ rank: 1, total: 1, improved: true });
  expect((await (await send(daily(PID_B, "Beto", 100, 98))).json()).global).toMatchObject({ rank: 1, total: 2 });
  const again = await (await send(daily(PID_A, "Ana", 70, 90, "aula5b"))).json();
  expect(again.global).toMatchObject({ rank: 2, improved: false }); // peor marca: no reemplaza
  expect(again.room).toMatchObject({ rank: 1, total: 1 });
  const better = await (await send(daily(PID_A, "Ana", 120, 99))).json();
  expect(better.global).toMatchObject({ rank: 1, improved: true });
  expect(store.size).toBe(3); // Ana global, Ana en sala y Beto: sin duplicados

  const g = await top("board=daily");
  expect(g.top.map((r: { nick: string }) => r.nick)).toEqual(["Ana", "Beto"]);
  expect((await top("board=daily&room=AULA5B")).total).toBe(1);
  expect((await top(`board=daily&me=${hashPid(PID_B)}`)).me).toMatchObject({ rank: 2, nick: "Beto" });
  expect((await GET(new Request("https://x/api/rank?board=otra"))).status).toBe(400);
});

test("moderación: borrar a un jugador requiere la clave", async () => {
  await send(daily(PID_A, "Ana", 80, 95));
  process.env.ADMIN_KEY = "clave";
  const id = hashPid(PID_A);
  expect((await GET(new Request(`https://x/api/rank?remove=${id}&key=mala`))).status).toBe(401);
  expect(await (await GET(new Request(`https://x/api/rank?remove=${id}&key=clave`))).json()).toEqual({ removed: 1 });
  expect((await top("board=daily")).total).toBe(0);
});

test("cada jugador puede borrar sus marcas con su código", async () => {
  await send(daily(PID_A, "Ana", 80, 95, "aula5b"));
  await send(daily(PID_B, "Beto", 90, 95));
  expect(store.size).toBe(3);
  const r = await send({ pid: PID_A, forget: true });
  expect(await r.json()).toEqual({ removed: 2 });
  expect(store.size).toBe(1); // solo queda Beto
  expect(await (await send({ pid: "corto", forget: true })).json()).toMatchObject({ error: "invalid" });
});
