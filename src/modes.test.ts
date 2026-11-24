import { expect, test } from "vitest";
import { dailyLevels, dateKey, endlessTexts, nextStreak, prevKey } from "./modes";

test("reto diario: igual para todos el mismo día, una frase por dificultad", () => {
  const a = dailyLevels("2026-11-24"), b = dailyLevels("2026-11-24");
  expect(a.map((l) => l.id)).toEqual(b.map((l) => l.id));
  expect(a.map((l) => l.diff)).toEqual(["easy", "medium", "hard"]);
  const days = Array.from({ length: 20 }, (_, i) => dailyLevels(dateKey(new Date(Date.UTC(2026, 0, 1 + i)))).map((l) => l.id).join());
  expect(new Set(days).size).toBeGreaterThan(10); // cambia de un día a otro
});

test("días seguidos", () => {
  expect(prevKey("2026-03-01")).toBe("2026-02-28");
  expect(prevKey("2026-01-01")).toBe("2025-12-31");
  expect(nextStreak("2026-11-23", "2026-11-24", 4)).toBe(5); // ayer → sigue
  expect(nextStreak("2026-11-24", "2026-11-24", 4)).toBe(4); // hoy otra vez → igual
  expect(nextStreak("2026-11-20", "2026-11-24", 4)).toBe(1); // se cortó
  expect(nextStreak("", "2026-11-24", 0)).toBe(1);
});

test("contrarreloj: recorre todas las frases antes de repetir", () => {
  const next = endlessTexts("es");
  const first = Array.from({ length: 30 }, next);
  expect(new Set(first).size).toBe(30);
  expect(next()).not.toBe(first[29]);
});
