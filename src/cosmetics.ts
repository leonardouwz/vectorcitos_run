import type { Lang } from "./content";

export type Slot = "head" | "face" | "body";
export interface Item { id: string; slot: Slot; price: number; emoji: string; name: Record<Lang, string> }

export const SLOTS: Slot[] = ["head", "face", "body"];

/** Accesorios del personaje. Para añadir uno: una entrada aquí y su modelo en src/scene.ts. */
export const ITEMS: Item[] = [
  { id: "party", slot: "head", price: 40, emoji: "🥳", name: { es: "Gorro de fiesta", en: "Party hat" } },
  { id: "tophat", slot: "head", price: 120, emoji: "🎩", name: { es: "Sombrero de copa", en: "Top hat" } },
  { id: "crown", slot: "head", price: 300, emoji: "👑", name: { es: "Corona", en: "Crown" } },
  { id: "glasses", slot: "face", price: 60, emoji: "👓", name: { es: "Gafas redondas", en: "Round glasses" } },
  { id: "shades", slot: "face", price: 150, emoji: "😎", name: { es: "Gafas de sol", en: "Sunglasses" } },
  { id: "bow", slot: "body", price: 80, emoji: "🎀", name: { es: "Moño", en: "Bow tie" } },
  { id: "cape", slot: "body", price: 220, emoji: "🦸", name: { es: "Capa", en: "Cape" } },
];

export const SLOT_NAMES: Record<Slot, Record<Lang, string>> = {
  head: { es: "Cabeza", en: "Head" },
  face: { es: "Cara", en: "Face" },
  body: { es: "Cuerpo", en: "Body" },
};

/** Monedas por partida: estrellas, velocidad y un extra por el modo. */
export function coinsFor(o: { kind: "level" | "daily" | "time"; stars: number; wpm: number; score: number; isBest: boolean }) {
  return o.stars * 5 + Math.round(o.wpm / 10) + (o.kind === "daily" ? 20 : 0) + (o.kind === "time" ? Math.floor(o.score / 200) : 0) + (o.isBest ? 5 : 0);
}

/** Regalo del día: sube con la racha del reto diario (hasta 10 días). */
export const giftFor = (streak: number) => 15 + Math.min(streak, 10) * 3;
