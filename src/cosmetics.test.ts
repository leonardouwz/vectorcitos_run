import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { comboCoins, comboTier, coinsFor, giftFor, ITEMS, rarityOf, SLOTS } from "./cosmetics";

test("combo: sube cada 3 palabras limpias, tope x5", () => {
  expect([0, 2, 3, 6, 9, 12, 99].map(comboTier)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  expect(comboCoins(7)).toBe(3);
  expect(coinsFor({ kind: "level", stars: 1, wpm: 0, score: 0, isBest: false, newStars: 2 })).toBe(8 + 20);
});

test("monedas y regalo", () => {
  expect(coinsFor({ kind: "level", stars: 3, wpm: 60, score: 0, isBest: false })).toBe(24 + 8);
  expect(coinsFor({ kind: "daily", stars: 1, wpm: 40, score: 0, isBest: true })).toBe(8 + 5 + 25 + 8);
  expect(coinsFor({ kind: "time", stars: 2, wpm: 50, score: 1000, isBest: false })).toBe(16 + 6 + 6);
  expect(giftFor(0)).toBe(15);
  expect(giftFor(99)).toBe(45); // tope a los 10 días
});

test("catálogo: ids únicos y nombres en dos idiomas", () => {
  expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  for (const i of ITEMS) { expect(SLOTS).toContain(i.slot); expect(i.name.es && i.name.en).toBeTruthy(); expect(i.price).toBeGreaterThan(0); }
});

test("cada color y cada estela traen su dato, y la rareza sube con el precio", () => {
  for (const i of ITEMS.filter((x) => x.slot === "skin")) expect(typeof i.hue).toBe("number");
  for (const i of ITEMS.filter((x) => x.slot === "trail")) expect(i.shape).toBeDefined();
  for (const i of ITEMS.filter((x) => x.slot === "trail")) expect(i.trail).toBeDefined();
  for (const i of ITEMS) { expect(i.blurb.es && i.blurb.en).toBeTruthy(); expect(existsSync(`public/icons/${i.icon}.webp`)).toBe(true); }
  expect([rarityOf(60), rarityOf(150), rarityOf(300), rarityOf(820)]).toEqual(["common", "rare", "epic", "legendary"]);
});
