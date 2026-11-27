// Niveles que añade o cambia el administrador (se guardan en el servidor) y modo desarrollador.
import { applyCustom, type CustomLevel } from "./content";

const CACHE = "vectorcitos-run:levels", ADMIN = "vectorcitos-run:admin";
const read = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? "null") as T; } catch { return null; } };

export let custom: CustomLevel[] = read<CustomLevel[]>(CACHE) ?? [];
applyCustom(custom); // enseguida, con lo último que se vio (así también funciona sin conexión)

/** Descarga los niveles vigentes. Devuelve true si cambió algo. */
export async function refreshLevels(): Promise<boolean> {
  try {
    const res = await fetch("/api/levels", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const next = ((await res.json()) as { levels?: CustomLevel[] }).levels ?? [];
    const changed = JSON.stringify(next) !== JSON.stringify(custom);
    custom = next; applyCustom(custom);
    try { localStorage.setItem(CACHE, JSON.stringify(custom)); } catch { /* sin almacenamiento */ }
    return changed;
  } catch { return false; }
}

// ---- Modo desarrollador: la clave se comprueba en el servidor y se recuerda en este dispositivo.
let key: string | null = read<string>(ADMIN);
export const isAdmin = () => !!key;
export async function adminLogin(k: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin", { method: "POST", headers: { "x-admin-key": k.trim() } });
    if (!res.ok) return false;
    key = k.trim();
    try { localStorage.setItem(ADMIN, JSON.stringify(key)); } catch { /* nada */ }
    return true;
  } catch { return false; }
}
export function adminLogout() { key = null; try { localStorage.removeItem(ADMIN); } catch { /* nada */ } }

/** Publica la lista completa de niveles personalizados. */
export async function saveLevels(list: CustomLevel[]): Promise<boolean> {
  if (!key) return false;
  try {
    const res = await fetch("/api/levels", { method: "PUT", headers: { "x-admin-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ levels: list }) });
    if (!res.ok) return false;
    custom = list; applyCustom(list);
    try { localStorage.setItem(CACHE, JSON.stringify(list)); } catch { /* nada */ }
    return true;
  } catch { return false; }
}
