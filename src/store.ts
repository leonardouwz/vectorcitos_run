import { LEVELS, type Lang } from "./content";
import { detectLang } from "./i18n";

export interface Best { stars: number; wpm: number; acc: number }
export interface Run extends Best { id: number; ts: number; errors: number; secs: number; miss: Record<string, number> }
const MAX_RUNS = 200;
interface Data {
  lang: Lang;
  muted: boolean;
  current: string;
  profiles: Record<string, Record<number, Best>>;
  history: Record<string, Run[]>;
}

const KEY = "vectorcitos-run:v2";
let data: Data = { lang: detectLang(), muted: false, current: "", profiles: {}, history: {} };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...data, ...JSON.parse(raw) };
} catch { /* sin almacenamiento: se juega igual, sin guardar */ }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* nada */ } };

export const store = {
  get lang() { return data.lang; },
  set lang(v: Lang) { data.lang = v; save(); },
  get muted() { return data.muted; },
  set muted(v: boolean) { data.muted = v; save(); },
  get current() { return data.current; },
  get names() { return Object.keys(data.profiles); },
  login(name: string) {
    data.current = name;
    data.profiles[name] ??= {};
    save();
  },
  /** Partidas del jugador actual, de la más antigua a la más reciente. */
  get runs(): Run[] { return data.history[data.current] ?? []; },
  addRun(r: Run) {
    const h = (data.history[data.current] ??= []);
    h.push(r);
    if (h.length > MAX_RUNS) h.splice(0, h.length - MAX_RUNS);
    save();
  },
  best(id: number): Best | undefined { return data.profiles[data.current]?.[id]; },
  /** Un nivel de la progresión se abre cuando el anterior tiene al menos una estrella. La práctica siempre está abierta. */
  unlocked(id: number) {
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return false;
    if (lv.free) return true;
    const seq = LEVELS.filter((l) => !l.free);
    const i = seq.findIndex((l) => l.id === id);
    return i === 0 || (i > 0 && !!this.best(seq[i - 1].id));
  },
  record(id: number, r: Best) {
    const p = data.profiles[data.current];
    const old = p[id];
    const better = !old || r.stars > old.stars || (r.stars === old.stars && r.wpm > old.wpm);
    if (better) { p[id] = r; save(); }
    return better;
  },
};
