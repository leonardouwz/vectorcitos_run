import { expect, test } from "vitest";
import { coinsFor, giftFor, ITEMS, rarityOf, SLOTS } from "./cosmetics";

test("monedas y regalo", () => {
  expect(coinsFor({ kind: "level", stars: 3, wpm: 60, score: 0, isBest: false })).toBe(21);
  expect(coinsFor({ kind: "daily", stars: 1, wpm: 40, score: 0, isBest: true })).toBe(5 + 4 + 20 + 5);
  expect(coinsFor({ kind: "time", stars: 2, wpm: 50, score: 1000, isBest: false })).toBe(10 + 5 + 5);
  expect(giftFor(0)).toBe(15);
  expect(giftFor(99)).toBe(45); // tope a los 10 días
});

test("catálogo: ids únicos y nombres en dos idiomas", () => {
  expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  for (const i of ITEMS) { expect(SLOTS).toContain(i.slot); expect(i.name.es && i.name.en).toBeTruthy(); expect(i.price).toBeGreaterThan(0); }
});

test("cada color y cada estela traen su dato, y la rareza sube con el precio", () => {
  for (const i of ITEMS.filter((x) => x.slot === "skin")) expect(typeof i.hue).toBe("number");
  for (const i of ITEMS.filter((x) => x.slot === "trail")) expect(i.trail).toBeDefined();
  expect([rarityOf(60), rarityOf(150), rarityOf(300)]).toEqual(["common", "rare", "epic"]);
});
