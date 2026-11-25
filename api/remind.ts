import { timingSafeEqual } from "node:crypto";
import { del, get, list } from "@vercel/blob";
import webpush from "web-push";
import { messageFor, type Sub } from "./_remind.js";

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lo llama Vercel Cron una vez al día (vercel.json). Manda el aviso a quien no ha hecho el reto de hoy. */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return new Response("No autorizado", { status: 401 });
  const { VAPID_PUBLIC, VAPID_PRIVATE } = process.env;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return new Response("VAPID no configurado", { status: 503 });
  webpush.setVapidDetails("mailto:noreply@vectorcitos-run.vercel.app", VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0, skipped = 0, removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "push/", cursor, limit: 500 });
    for (const b of page.blobs) {
      const res = await get(b.pathname, { access: "private" });
      if (!res || res.statusCode !== 200) continue;
      let s: Sub;
      try { s = JSON.parse(await new Response(res.stream).text()); } catch { await del(b.pathname); removed++; continue; }
      const msg = messageFor(s);
      if (!msg) { skipped++; continue; }
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ ...msg, url: "/?daily=1" }), { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await del(b.pathname); removed++; } // la persona quitó el permiso
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return Response.json({ sent, skipped, removed });
}
