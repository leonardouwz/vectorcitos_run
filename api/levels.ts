import { get, put } from "@vercel/blob";
import { isAdmin } from "./_admin.js";
import { validLevels } from "./_levels.js";

const PATH = "config/levels.json";
const json = (data: unknown, status = 200, cache = "no-store") => Response.json(data, { status, headers: { "Cache-Control": cache } });

/** GET: niveles personalizados (público). PUT: los guarda (solo administrador). */
export async function GET() {
  try {
    const r = await get(PATH, { access: "private" });
    if (r && r.statusCode === 200) return json(JSON.parse(await new Response(r.stream).text()), 200, "public, s-maxage=30, stale-while-revalidate=300");
  } catch { /* aún no hay niveles personalizados */ }
  return json({ levels: [] }, 200, "public, s-maxage=30");
}

export async function PUT(request: Request) {
  if (!isAdmin(request)) return json({ error: "unauthorized" }, 401);
  const raw = await request.text();
  if (raw.length > 200_000) return json({ error: "too_long" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid" }, 400); }
  const levels = validLevels(body);
  if (!levels) return json({ error: "invalid" }, 400);
  await put(PATH, JSON.stringify({ levels, ts: new Date().toISOString() }), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  return json({ ok: true, count: levels.length });
}
