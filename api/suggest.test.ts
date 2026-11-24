import { beforeEach, expect, test, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@vercel/blob", () => ({
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...store.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })), hasMore: false }),
  put: async (name: string, body: string) => { store.set(name, body); return {}; },
  get: async (name: string) => ({ statusCode: 200, stream: new Response(store.get(name)).body }),
}));

import { POST } from "./suggest";
import { GET } from "./inbox";
import { validate } from "./_validate";

const send = (body: unknown) => POST(new Request("https://x/api/suggest", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => store.clear());

test("valida: mensaje, categoría y campo trampa", () => {
  expect(validate({ message: "hola", category: "idea" })).toMatchObject({ ok: false, error: "too_short" });
  expect(validate({ message: "x".repeat(1001), category: "idea" })).toMatchObject({ ok: false, error: "too_long" });
  expect(validate({ message: "buena idea", category: "otra" })).toMatchObject({ ok: false });
  expect(validate({ message: "buena idea", category: "idea", website: "http://spam" })).toMatchObject({ spam: true });
  expect(validate({ message: " buena\u0000 idea ", category: "bug", lang: "en", alias: "Ana" })).toEqual({ ok: true, value: { category: "bug", message: "buena idea", alias: "Ana", lang: "en" } });
});

test("guarda, ignora bots y limita por día; el buzón pide clave", async () => {
  expect((await send({ message: "Más niveles por favor", category: "idea" })).status).toBe(201);
  expect(store.size).toBe(1);
  expect((await send({ message: "compra pastillas", category: "idea", website: "x" })).status).toBe(201);
  expect(store.size).toBe(1); // el bot cree que funcionó, pero no se guardó
  expect((await send({ message: "no", category: "idea" })).status).toBe(400);

  process.env.ADMIN_KEY = "clave-secreta";
  expect((await GET(new Request("https://x/api/inbox?key=mala"))).status).toBe(401);
  const ok = await GET(new Request("https://x/api/inbox?key=clave-secreta&format=json"));
  expect((await ok.json()).items[0].message).toBe("Más niveles por favor");
  const html = await (await GET(new Request("https://x/api/inbox?key=clave-secreta"))).text();
  expect(html).toContain("Más niveles");

  for (let i = 0; i < 200; i++) store.set(`suggestions/${new Date().toISOString().slice(0, 10)}/f${i}`, "{}");
  expect((await send({ message: "otro mensaje", category: "idea" })).status).toBe(429);
});

test("el buzón escapa HTML", async () => {
  await send({ message: "<script>alert(1)</script>", category: "bug" });
  process.env.ADMIN_KEY = "k";
  const html = await (await GET(new Request("https://x/api/inbox?key=k"))).text();
  expect(html).not.toContain("<script>alert");
  expect(html).toContain("&#60;script&#62;");
});
