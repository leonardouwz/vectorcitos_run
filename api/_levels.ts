// Niveles personalizados: lo que el administrador añade, cambia u oculta sobre los niveles que trae el juego.
export type DiffName = "easy" | "medium" | "hard" | "practice";
export interface CustomLevel {
  id: number; diff: DiffName;
  es: string; en: string;
  title?: { es: string; en: string };
  hidden?: boolean;
}

const DIFFS = ["easy", "medium", "hard", "practice"];
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Valida la lista completa que manda el administrador. null si algo no cuadra. */
export function validLevels(body: unknown): CustomLevel[] | null {
  const list = (body as { levels?: unknown })?.levels;
  if (!Array.isArray(list) || list.length > 500) return null;
  const out: CustomLevel[] = [], seen = new Set<number>();
  for (const raw of list) {
    const o = raw as Record<string, any>;
    if (!Number.isInteger(o?.id) || o.id < 1 || o.id > 9999 || seen.has(o.id) || !DIFFS.includes(o.diff)) return null;
    const es = clean(o.es, 240), en = clean(o.en, 240);
    if (!o.hidden && (es.length < 3 || en.length < 3)) return null;
    seen.add(o.id);
    const lv: CustomLevel = { id: o.id, diff: o.diff, es, en };
    if (o.title && (clean(o.title.es, 40) || clean(o.title.en, 40))) lv.title = { es: clean(o.title.es, 40), en: clean(o.title.en, 40) };
    if (o.hidden === true) lv.hidden = true;
    out.push(lv);
  }
  return out;
}
