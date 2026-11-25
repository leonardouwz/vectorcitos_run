// Avisos en el celular: recordatorio del reto diario y de la racha (Web Push).
const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

export type PushState = "unsupported" | "needsInstall" | "blocked" | "off" | "on";

const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (!("PushManager" in window) || !("Notification" in window)) return ios() && !standalone() ? "needsInstall" : "unsupported";
  if (ios() && !standalone()) return "needsInstall"; // en iPhone/iPad solo funciona con la app añadida a inicio
  if (Notification.permission === "denied") return "blocked";
  const sub = await (await registration())?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

interface Status { lang: string; last: string; streak: number }

async function send(sub: PushSubscription, s: Status) {
  await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON(), ...s }) });
}

export async function enablePush(s: Status): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") return Notification.permission === "denied" ? "blocked" : "off";
  const { key } = await (await fetch("/api/push")).json() as { key: string };
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  await send(sub, s);
  return "on";
}

export async function disablePush() {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe();
}

/** Al terminar el reto, se avisa al servidor para que no moleste ese día. */
export async function syncPush(s: Status) {
  try {
    if (Notification.permission !== "granted") return;
    const sub = await (await registration())?.pushManager.getSubscription();
    if (sub) await send(sub, s);
  } catch { /* sin conexión: no pasa nada */ }
}
