import { LEVELS, type Lang } from "./content";
import { detectLang } from "./i18n";
import { dateKey, nextStreak, prevKey } from "./modes";

export interface Best { stars: number; wpm: number; acc: number }
export interface Run extends Best { id: number; ts: number; errors: number; secs: number; miss: Record<string, number> }
const MAX_RUNS = 200;
export interface Online { pid: string; on: boolean; room: string }
export interface DayResult { stars: number; wpm: number; acc: number }
export interface Daily { streak: number; last: string; days: Record<string, DayResult> }
interface Data {
  lang: Lang;
  muted: boolean;
  current: string;
  profiles: Record<string, Record<number, Best>>;
  history: Record<string, Run[]>;
  time: Record<string, number>;
  daily: Record<string, Daily>;
  online: Record<string, Online>;
  help: boolean;
  guideSeen: Record<string, boolean>;
}

const KEY = "vectorcitos-run:v2";
let data: Data = { lang: detectLang(), muted: false, current: "", profiles: {}, history: {}, time: {}, daily: {}, online: {}, help: true, guideSeen: {} };
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
  /** Mejor puntaje de contrarreloj del jugador actual. */
  get bestTime() { return data.time[data.current] ?? 0; },
  recordTime(score: number) {
    const better = score > this.bestTime;
    if (better) { data.time[data.current] = score; save(); }
    return better;
  },
  /** Ajustes del ranking en línea. El código privado (pid) nunca sale del dispositivo, salvo para firmar las marcas. */
  /** Teclado con colores de dedos durante el juego. */
  get help() { return data.help; },
  set help(v: boolean) { data.help = v; save(); },
  get guideSeen() { return !!data.guideSeen[data.current]; },
  markGuide() { data.guideSeen[data.current] = true; save(); },
  get online(): Online {
    let o = data.online[data.current];
    if (!o) { o = data.online[data.current] = { pid: crypto.randomUUID(), on: false, room: "" }; save(); }
    return o;
  },
  setOnline(patch: Partial<Omit<Online, "pid">>) { Object.assign(this.online, patch); save(); },
  get daily(): Daily { return data.daily[data.current] ?? { streak: 0, last: "", days: {} }; },
  /** Días seguidos vigentes: si pasó más de un día sin jugar el reto, la racha se perdió. */
  get dailyStreak() {
    const d = this.daily, today = dateKey();
    return d.last === today || d.last === prevKey(today) ? d.streak : 0;
  },
  recordDaily(day: string, r: DayResult) {
    const d = (data.daily[data.current] ??= { streak: 0, last: "", days: {} });
    const old = d.days[day];
    d.streak = nextStreak(d.last, day, d.streak);
    d.last = day;
    if (!old || r.stars > old.stars || (r.stars === old.stars && r.wpm > old.wpm)) d.days[day] = r;
    const keep = Object.keys(d.days).sort().slice(-60);
    d.days = Object.fromEntries(keep.map((k) => [k, d.days[k]]));
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
