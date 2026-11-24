import { timingSafeEqual } from "node:crypto";
import { get, list } from "@vercel/blob";
import type { Suggestion } from "./_validate";

const MAX_SHOWN = 300;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function authorized(given: string | null) {
  const key = process.env.ADMIN_KEY;
  if (!key || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Buzón para la persona que administra el juego: /api/inbox?key=TU_CLAVE */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };
  if (!process.env.ADMIN_KEY) return new Response("ADMIN_KEY no está configurada", { status: 503, headers });
  if (!authorized(url.searchParams.get("key"))) return new Response("No autorizado", { status: 401, headers });

  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "suggestions/", cursor, limit: 1000 });
    names.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && names.length < 5000);
  names.sort().reverse(); // la ruta empieza por la fecha: lo más nuevo primero

  const items: Suggestion[] = [];
  for (const name of names.slice(0, MAX_SHOWN)) {
    const r = await get(name, { access: "private" });
    if (r && r.statusCode === 200) items.push(JSON.parse(await new Response(r.stream).text()));
  }

  if (url.searchParams.get("format") === "json") return Response.json({ total: names.length, items }, { headers });
  const rows = items.map((s) => `<article><header><b>${esc(s.category)}</b> · ${esc(s.ts.replace("T", " ").slice(0, 16))} UTC · ${esc(s.lang)}${s.alias ? ` · ${esc(s.alias)}` : ""}</header><p>${esc(s.message)}</p></article>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Buzón · Vectorcitos Run</title>
<style>body{font:16px/1.5 system-ui;background:#050429;color:#eaeaea;max-width:720px;margin:0 auto;padding:16px}h1{color:#17ff93;font-weight:400}article{background:#0a0a35;border:1px solid #23235a;border-radius:8px;padding:12px 16px;margin:12px 0}header{color:#a9a9d0;font-size:.85rem}p{white-space:pre-wrap;margin:.4rem 0 0}</style>
<h1>Buzón de sugerencias</h1><p>${names.length} mensajes${names.length > MAX_SHOWN ? ` (se muestran los ${MAX_SHOWN} más nuevos)` : ""}</p>${rows || "<p>Aún no hay mensajes.</p>"}`;
  return new Response(html, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
