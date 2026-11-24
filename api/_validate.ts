export const CATEGORIES = ["idea", "bug", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Suggestion { category: Category; message: string; alias: string; lang: "es" | "en"; ts: string }

// Quita caracteres de control (menos salto de línea) y recorta espacios.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();

export type Checked = { ok: true; value: Omit<Suggestion, "ts"> } | { ok: false; error: string; spam?: boolean };

export function validate(body: unknown): Checked {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid" };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { ok: false, error: "spam", spam: true }; // campo trampa para bots
  const message = typeof b.message === "string" ? clean(b.message) : "";
  if (message.length < 5) return { ok: false, error: "too_short" };
  if (message.length > 1000) return { ok: false, error: "too_long" };
  const category = CATEGORIES.find((c) => c === b.category);
  if (!category) return { ok: false, error: "invalid" };
  const alias = typeof b.alias === "string" ? clean(b.alias).slice(0, 40) : "";
  const lang = b.lang === "en" ? "en" : "es";
  return { ok: true, value: { category, message, alias, lang } };
}
