import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { validSub } from "./_remind.js";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const pushPath = (endpoint: string) => `push/${createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}.json`;

/** GET: clave pública para suscribirse. POST: guarda o actualiza la suscripción. DELETE: la borra. */
export async function GET() {
  const key = process.env.VAPID_PUBLIC;
  return key ? json({ key }) : json({ error: "off" }, 503);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 3000) return json({ error: "too_long" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid" }, 400); }
  const s = validSub(body);
  if (!s) return json({ error: "invalid" }, 400);
  await put(pushPath(s.sub.endpoint), JSON.stringify(s), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  return json({ ok: true }, 201);
}

export async function DELETE(request: Request) {
  let endpoint = "";
  try { endpoint = String(((await request.json()) as { endpoint?: string }).endpoint ?? ""); } catch { /* vacío */ }
  if (!/^https:\/\//.test(endpoint)) return json({ error: "invalid" }, 400);
  await del(pushPath(endpoint));
  return json({ ok: true });
}
