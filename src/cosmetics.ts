import type { Lang } from "./content";
import type { IconName } from "./icons";

export type Slot = "head" | "face" | "body" | "skin" | "trail";
export type Rarity = "common" | "rare" | "epic";
export interface Item {
  id: string; slot: Slot; price: number; icon: IconName; name: Record<Lang, string>;
  /** Solo para "skin": cuántos grados se gira el color verde original. */
  hue?: number;
  /** Solo para "trail": color de las chispas y de las líneas de velocidad ("rainbow" = cambia). */
  trail?: number | "rainbow";
}

export const SLOTS: Slot[] = ["head", "face", "body", "skin", "trail"];

/** Accesorios, colores y estelas. Para añadir uno: una entrada aquí (y, si es un accesorio, su modelo en src/hero.ts). */
export const ITEMS: Item[] = [
  { id: "party", slot: "head", price: 40, icon: "party", name: { es: "Gorro de fiesta", en: "Party hat" } },
  { id: "headphones", slot: "head", price: 140, icon: "headphones", name: { es: "Audífonos", en: "Headphones" } },
  { id: "tophat", slot: "head", price: 120, icon: "tophat", name: { es: "Sombrero de copa", en: "Top hat" } },
  { id: "wizard", slot: "head", price: 180, icon: "wizard", name: { es: "Sombrero de mago", en: "Wizard hat" } },
  { id: "halo", slot: "head", price: 220, icon: "halo", name: { es: "Aureola", en: "Halo" } },
  { id: "crown", slot: "head", price: 300, icon: "crown", name: { es: "Corona", en: "Crown" } },
  { id: "glasses", slot: "face", price: 60, icon: "glasses", name: { es: "Gafas redondas", en: "Round glasses" } },
  { id: "monocle", slot: "face", price: 90, icon: "monocle", name: { es: "Monóculo", en: "Monocle" } },
  { id: "shades", slot: "face", price: 150, icon: "shades", name: { es: "Gafas de sol", en: "Sunglasses" } },
  { id: "visor", slot: "face", price: 260, icon: "visor", name: { es: "Visor de neón", en: "Neon visor" } },
  { id: "bow", slot: "body", price: 80, icon: "bow", name: { es: "Moño", en: "Bow tie" } },
  { id: "scarf", slot: "body", price: 110, icon: "scarf", name: { es: "Bufanda", en: "Scarf" } },
  { id: "cape", slot: "body", price: 220, icon: "cape", name: { es: "Capa", en: "Cape" } },
  { id: "wings", slot: "body", price: 350, icon: "wings", name: { es: "Alas", en: "Wings" } },
  { id: "skin-ocean", slot: "skin", price: 100, icon: "skin", hue: 60, name: { es: "Azul océano", en: "Ocean blue" } },
  { id: "skin-sunset", slot: "skin", price: 100, icon: "skin", hue: -110, name: { es: "Naranja atardecer", en: "Sunset orange" } },
  { id: "skin-violet", slot: "skin", price: 160, icon: "skin", hue: 120, name: { es: "Violeta", en: "Violet" } },
  { id: "skin-rose", slot: "skin", price: 160, icon: "skin", hue: 180, name: { es: "Rosa chicle", en: "Bubblegum pink" } },
  { id: "skin-gold", slot: "skin", price: 320, icon: "gem", hue: -95, name: { es: "Dorado", en: "Gold" } },
  { id: "trail-gold", slot: "trail", price: 120, icon: "sparks", trail: 0xffc107, name: { es: "Chispas doradas", en: "Golden sparks" } },
  { id: "trail-hearts", slot: "trail", price: 160, icon: "hearts", trail: 0xff8ad6, name: { es: "Corazones", en: "Hearts" } },
  { id: "trail-rainbow", slot: "trail", price: 300, icon: "rainbow", trail: "rainbow", name: { es: "Arcoíris", en: "Rainbow" } },
];

export const SLOT_NAMES: Record<Slot, Record<Lang, string>> = {
  head: { es: "Cabeza", en: "Head" },
  face: { es: "Cara", en: "Face" },
  body: { es: "Cuerpo", en: "Body" },
  skin: { es: "Color", en: "Color" },
  trail: { es: "Estela", en: "Trail" },
};

/** Rareza según el precio: se ve en el borde de cada tarjeta. */
export const rarityOf = (price: number): Rarity => (price >= 250 ? "epic" : price >= 120 ? "rare" : "common");

/** Monedas por partida: estrellas, velocidad y un extra por el modo. */
export function coinsFor(o: { kind: "level" | "daily" | "time"; stars: number; wpm: number; score: number; isBest: boolean }) {
  return o.stars * 5 + Math.round(o.wpm / 10) + (o.kind === "daily" ? 20 : 0) + (o.kind === "time" ? Math.floor(o.score / 200) : 0) + (o.isBest ? 5 : 0);
}

/** Regalo del día: sube con la racha del reto diario (hasta 10 días). */
export const giftFor = (streak: number) => 15 + Math.min(streak, 10) * 3;
