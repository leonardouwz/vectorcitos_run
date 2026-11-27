import { expect, test } from "vitest";
import { LEVELS } from "./content";

test("contenido: ids únicos, dos idiomas y dificultad creciente", () => {
  expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  for (const l of LEVELS) {
    expect(l.text.es.length).toBeGreaterThan(3);
    expect(l.text.en.length).toBeGreaterThan(3);
    expect(l.text.es).not.toMatch(/\s{2,}|^\s|\s$/); // un espacio doble haría imposible el nivel
    expect(l.text.en).not.toMatch(/\s{2,}|^\s|\s$/);
  }
  const avg = (d: string) => { const a = LEVELS.filter((l) => l.diff === d); return a.reduce((n, l) => n + l.text.es.length, 0) / a.length; };
  for (const d of ["easy", "medium", "hard"]) expect(LEVELS.filter((l) => l.diff === d).length).toBeGreaterThanOrEqual(10);
  expect(avg("easy")).toBeLessThan(avg("medium"));
  expect(avg("medium")).toBeLessThan(avg("hard"));
  // los niveles que ya existían conservan su número
  expect(LEVELS.slice(0, 6).map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(LEVELS.find((l) => l.diff === "medium")!.id).toBe(11);
  expect(LEVELS.find((l) => l.diff === "hard")!.id).toBe(21);
});

import { applyCustom, factoryLevels } from "./content";
test("niveles personalizados: cambiar, ocultar y añadir", () => {
  const n = LEVELS.length;
  applyCustom([{ id: 1, diff: "easy", es: "Texto nuevo.", en: "New text." }, { id: 2, diff: "easy", es: "", en: "", hidden: true }, { id: 250, diff: "easy", es: "Otro nivel.", en: "Another level." }]);
  expect(LEVELS.find((l) => l.id === 1)!.text.es).toBe("Texto nuevo.");
  expect(LEVELS.some((l) => l.id === 2)).toBe(false);
  expect(LEVELS.length).toBe(n); // uno oculto, uno añadido
  const easy = LEVELS.filter((l) => l.diff === "easy");
  expect(easy[easy.length - 1].id).toBe(250);
  expect(easy.map((l) => l.n)).toEqual(easy.map((_, i) => i + 1));
  applyCustom([]);
  expect(LEVELS.map((l) => l.id)).toEqual(factoryLevels().map((l) => l.id));
});
