import { list, put } from "@vercel/blob";
import { validate } from "./_validate";

const DAILY_CAP = 200; // tope de mensajes por día para que un bot no llene el buzón

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4000) return json({ error: "too_long" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid" }, 400); }

  const checked = validate(body);
  if (!checked.ok) return checked.spam ? json({ ok: true }, 201) : json({ error: checked.error }, 400); // al bot se le dice que funcionó

  const day = new Date().toISOString().slice(0, 10);
  const { blobs } = await list({ prefix: `suggestions/${day}/`, limit: DAILY_CAP });
  if (blobs.length >= DAILY_CAP) return json({ error: "busy" }, 429);

  const record = { ...checked.value, ts: new Date().toISOString() };
  await put(`suggestions/${day}/${Date.now()}.json`, JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: true,
  });
  return json({ ok: true }, 201);
}
