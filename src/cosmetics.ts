import type { Lang } from "./content";
import type { IconName } from "./icons";

export type Slot = "head" | "face" | "body" | "skin" | "trail";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export interface Item {
  id: string; slot: Slot; price: number; icon: IconName; name: Record<Lang, string>; blurb: Record<Lang, string>;
  /** Solo "skin": cuántos grados se gira el color verde original. */
  hue?: number;
  /** Solo "skin": acabado especial. "metal" = cromado; "cycle" = el color cambia sin parar. */
  finish?: "metal" | "cycle";
  /** Solo "trail": color de las chispas y de las líneas de velocidad ("rainbow" = cambia). */
  trail?: number | "rainbow";
  /** Solo "trail": forma de cada partícula. */
  shape?: "dot" | "heart" | "star" | "flame";
}

export const SLOTS: Slot[] = ["head", "face", "body", "skin", "trail"];

/** Accesorios, colores y estelas. Para añadir uno: una entrada aquí, su icono (scripts/slice-icons.py) y, si es un accesorio, su modelo en src/hero.ts. */
export const ITEMS: Item[] = [
  { id: "party", slot: "head", price: 40, icon: "party", name: { es: "Gorro de fiesta", en: "Party hat" }, blurb: { es: "Cada palabra es una celebración.", en: "Every word is a celebration." } },
  { id: "catears", slot: "head", price: 90, icon: "catears", name: { es: "Orejas de gato", en: "Cat ears" }, blurb: { es: "Se mueven cuando aciertas.", en: "They twitch when you score." } },
  { id: "headphones", slot: "head", price: 140, icon: "headphones", name: { es: "Audífonos", en: "Headphones" }, blurb: { es: "Brillan al ritmo de la música.", en: "They glow to the beat." } },
  { id: "tophat", slot: "head", price: 160, icon: "tophat", name: { es: "Sombrero de copa", en: "Top hat" }, blurb: { es: "Elegancia a 100 palabras por minuto.", en: "Elegance at 100 words per minute." } },
  { id: "wizard", slot: "head", price: 220, icon: "wizard", name: { es: "Sombrero de mago", en: "Wizard hat" }, blurb: { es: "Con estrellas que centellean.", en: "With twinkling stars." } },
  { id: "halo", slot: "head", price: 340, icon: "halo", name: { es: "Aureola", en: "Halo" }, blurb: { es: "Flota, gira y deja destellos.", en: "Floats, spins and sparkles." } },
  { id: "crown", slot: "head", price: 480, icon: "crown", name: { es: "Corona real", en: "Royal crown" }, blurb: { es: "Con gemas que brillan.", en: "With shining jewels." } },
  { id: "spacehelmet", slot: "head", price: 720, icon: "spacehelmet", name: { es: "Casco espacial", en: "Space helmet" }, blurb: { es: "Cúpula de cristal con estrellas dentro.", en: "A glass dome with stars inside." } },
  { id: "glasses", slot: "face", price: 60, icon: "glasses", name: { es: "Gafas redondas", en: "Round glasses" }, blurb: { es: "Para leer cada letra con estilo.", en: "Read every letter in style." } },
  { id: "mustache", slot: "face", price: 70, icon: "mustache", name: { es: "Bigote", en: "Mustache" }, blurb: { es: "Un clásico que nunca falla.", en: "A classic that never fails." } },
  { id: "monocle", slot: "face", price: 110, icon: "monocle", name: { es: "Monóculo", en: "Monocle" }, blurb: { es: "Con cadena de oro.", en: "With a golden chain." } },
  { id: "shades", slot: "face", price: 150, icon: "shades", name: { es: "Gafas de sol", en: "Sunglasses" }, blurb: { es: "Con reflejos que se mueven.", en: "With moving reflections." } },
  { id: "visor", slot: "face", price: 360, icon: "visor", name: { es: "Visor de neón", en: "Neon visor" }, blurb: { es: "Una luz recorre el visor.", en: "A light sweeps across the visor." } },
  { id: "bow", slot: "body", price: 80, icon: "bow", name: { es: "Moño", en: "Bow tie" }, blurb: { es: "Pequeño y encantador.", en: "Small and charming." } },
  { id: "scarf", slot: "body", price: 120, icon: "scarf", name: { es: "Bufanda", en: "Scarf" }, blurb: { es: "Ondea mientras corres.", en: "Flutters as you run." } },
  { id: "cape", slot: "body", price: 260, icon: "cape", name: { es: "Capa de héroe", en: "Hero cape" }, blurb: { es: "Vuela más cuanto más rápido escribes.", en: "Flies higher the faster you type." } },
  { id: "wings", slot: "body", price: 500, icon: "wings", name: { es: "Alas de ángel", en: "Angel wings" }, blurb: { es: "Aletean con cada palabra.", en: "Flap with every word." } },
  { id: "jetpack", slot: "body", price: 820, icon: "jetpack", name: { es: "Mochila cohete", en: "Jetpack" }, blurb: { es: "Llamas de verdad al acelerar.", en: "Real flames when you speed up." } },
  { id: "skin-ocean", slot: "skin", price: 100, icon: "paint", hue: 60, name: { es: "Azul océano", en: "Ocean blue" }, blurb: { es: "Fresco como el mar.", en: "Cool as the sea." } },
  { id: "skin-sunset", slot: "skin", price: 100, icon: "paint", hue: -110, name: { es: "Naranja atardecer", en: "Sunset orange" }, blurb: { es: "Cálido como el final del día.", en: "Warm as the end of the day." } },
  { id: "skin-violet", slot: "skin", price: 160, icon: "paint", hue: 120, name: { es: "Violeta", en: "Violet" }, blurb: { es: "Misterioso y brillante.", en: "Mysterious and bright." } },
  { id: "skin-rose", slot: "skin", price: 160, icon: "paint", hue: 180, name: { es: "Rosa chicle", en: "Bubblegum pink" }, blurb: { es: "Dulce y divertido.", en: "Sweet and fun." } },
  { id: "skin-gold", slot: "skin", price: 400, icon: "gem", hue: -95, name: { es: "Dorado", en: "Gold" }, blurb: { es: "Para quien llegó a la cima.", en: "For those who reached the top." } },
  { id: "skin-chrome", slot: "skin", price: 560, icon: "gem", hue: 0, finish: "metal", name: { es: "Cromado", en: "Chrome" }, blurb: { es: "Acabado de espejo que refleja el mundo.", en: "A mirror finish that reflects the world." } },
  { id: "skin-rainbow", slot: "skin", price: 950, icon: "rainbow", hue: 0, finish: "cycle", name: { es: "Arcoíris vivo", en: "Living rainbow" }, blurb: { es: "Cambia de color sin parar.", en: "Never stops changing color." } },
  { id: "trail-gold", slot: "trail", price: 140, icon: "sparks", trail: 0xffc107, shape: "star", name: { es: "Chispas doradas", en: "Golden sparks" }, blurb: { es: "Deja un rastro de oro.", en: "Leaves a golden trail." } },
  { id: "trail-hearts", slot: "trail", price: 190, icon: "hearts", trail: 0xff6fb5, shape: "heart", name: { es: "Corazones", en: "Hearts" }, blurb: { es: "Corazones que flotan al correr.", en: "Hearts float as you run." } },
  { id: "trail-stars", slot: "trail", price: 260, icon: "stars", trail: "rainbow", shape: "star", name: { es: "Lluvia de estrellas", en: "Star shower" }, blurb: { es: "Estrellas de todos los colores.", en: "Stars of every color." } },
  { id: "trail-fire", slot: "trail", price: 450, icon: "flames", trail: 0xff7a1a, shape: "flame", name: { es: "Fuego", en: "Fire" }, blurb: { es: "Dejas el suelo en llamas.", en: "You set the ground ablaze." } },
  { id: "trail-rainbow", slot: "trail", price: 720, icon: "rainbow", trail: "rainbow", shape: "dot", name: { es: "Estela arcoíris", en: "Rainbow trail" }, blurb: { es: "Una cinta de colores detrás de ti.", en: "A ribbon of color behind you." } },
];

export const SLOT_NAMES: Record<Slot, Record<Lang, string>> = {
  head: { es: "Cabeza", en: "Head" },
  face: { es: "Cara", en: "Face" },
  body: { es: "Cuerpo", en: "Body" },
  skin: { es: "Color", en: "Color" },
  trail: { es: "Estela", en: "Trail" },
};
export const SLOT_ICONS: Record<Slot, IconName> = { head: "tophat", face: "shades", body: "cape", skin: "paint", trail: "sparks" };

export const RARITY_NAMES: Record<Rarity, Record<Lang, string>> = {
  common: { es: "Común", en: "Common" },
  rare: { es: "Raro", en: "Rare" },
  epic: { es: "Épico", en: "Epic" },
  legendary: { es: "Legendario", en: "Legendary" },
};
/** Rareza según el precio: se ve en el borde de cada tarjeta y en los efectos de la compra. */
export const rarityOf = (price: number): Rarity => (price >= 700 ? "legendary" : price >= 300 ? "epic" : price >= 120 ? "rare" : "common");

/** Monedas por partida: estrellas, velocidad y un extra por el modo. */
export function coinsFor(o: { kind: "level" | "daily" | "time"; stars: number; wpm: number; score: number; isBest: boolean }) {
  return o.stars * 5 + Math.round(o.wpm / 10) + (o.kind === "daily" ? 20 : 0) + (o.kind === "time" ? Math.floor(o.score / 200) : 0) + (o.isBest ? 5 : 0);
}

/** Regalo del día: sube con la racha del reto diario (hasta 10 días). */
export const giftFor = (streak: number) => 15 + Math.min(streak, 10) * 3;
