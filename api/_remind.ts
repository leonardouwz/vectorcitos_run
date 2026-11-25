// Lógica de los avisos del reto diario (sin red: así se puede probar).
export interface Sub { sub: { endpoint: string; keys: { p256dh: string; auth: string } }; lang: "es" | "en"; last: string; streak: number; ts: number }

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 864e5;

/** null = no avisar. El reto diario cambia a las 00:00 UTC, igual que en el juego. */
export function messageFor(s: Sub, now = Date.now()): { title: string; body: string } | null {
  const today = day(now);
  if (s.last === today) return null; // ya lo hizo hoy
  if (now - s.ts > 14 * DAY) return null; // lleva dos semanas sin abrir el juego: no insistir
  const atRisk = s.streak > 0 && s.last === day(now - DAY);
  const es = s.lang === "es";
  if (atRisk) {
    return es
      ? { title: `🔥 ¡Tu racha de ${s.streak} días está en juego!`, body: "Un reto de 1 minuto y la mantienes. Vectorcito te espera." }
      : { title: `🔥 Your ${s.streak}-day streak is at stake!`, body: "One 1-minute challenge keeps it alive. Vectorcito is waiting." };
  }
  return es
    ? { title: "⚡ ¡Ya está el reto diario!", body: "Frases nuevas de hoy, monedas y una racha por empezar." }
    : { title: "⚡ Today's daily challenge is ready!", body: "New phrases, coins and a streak to start." };
}

export function validSub(b: unknown): Sub | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, any>;
  const s = o.sub;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 600) return null;
  if (typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string" || s.keys.p256dh.length > 200 || s.keys.auth.length > 100) return null;
  const last = typeof o.last === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.last) ? o.last : "";
  const streak = Number.isInteger(o.streak) && o.streak >= 0 && o.streak < 10000 ? o.streak : 0;
  return { sub: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, lang: o.lang === "en" ? "en" : "es", last, streak, ts: Date.now() };
}
