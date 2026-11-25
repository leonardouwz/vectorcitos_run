/** Desde dónde se juega: teléfono, tablet o computador, y con qué se escribe. */
import { detectOS, kindFor, type Kind, type OS } from "./device-detect";

export interface Device { kind: Kind; touch: boolean; os: OS; standalone: boolean; hwKeyboard: boolean }

const HW_KEY = "vectorcitos-run:hwkeyboard";
const read = (k: string) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };

function detect(): Device {
  const touch = matchMedia("(pointer: coarse)").matches; // el control principal es el dedo
  const nav = navigator as Navigator & { userAgentData?: { platform?: string }; standalone?: boolean };
  return {
    kind: kindFor(touch, Math.min(screen.width, screen.height)),
    touch,
    os: detectOS(nav.userAgent, nav.userAgentData?.platform ?? nav.platform ?? "", nav.maxTouchPoints ?? 0),
    standalone: matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    hwKeyboard: read(HW_KEY),
  };
}

export const device = detect();

/** Los teclados físicos envían la tecla real (`code`); los de pantalla casi nunca. */
export function noteKey(e: KeyboardEvent) {
  if (device.hwKeyboard || !device.touch || !e.isTrusted || !/^(Key|Digit|Space)/.test(e.code)) return;
  device.hwKeyboard = true;
  try { localStorage.setItem(HW_KEY, "1"); } catch { /* sin almacenamiento */ }
}

/** ¿Se escribe con teclado físico? Así se decide si mostrar el teclado de colores. */
export const physicalKeys = () => !device.touch || device.hwKeyboard;

/** Texto corto para saber desde dónde llegó un mensaje del buzón. */
export const deviceLabel = () => `${device.kind}/${device.os}${device.standalone ? "/app" : ""}`;

/** Deja el tipo de dispositivo en <html> para que el CSS se adapte. */
export function applyDevice() {
  const d = document.documentElement.dataset;
  d.kind = device.kind;
  d.touch = String(device.touch);
  d.os = device.os;
  d.standalone = String(device.standalone);
}
