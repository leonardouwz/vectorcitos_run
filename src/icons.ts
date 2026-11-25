// Iconos propios del juego (stickers 3D generados con Higgsfield). Los archivos están en public/icons
// y se cortan de las hojas de assets/icon-sheets con scripts/slice-icons.py.
export type { IconName } from "./icon-names";
import type { IconName } from "./icon-names";

/** Icono para insertar en el HTML. Es decorativo: el texto que lo acompaña dice lo mismo. */
export const ic = (name: IconName) => `<img class="ic" src="/icons/${name}.webp" alt="" width="64" height="64" decoding="async" draggable="false">`;
