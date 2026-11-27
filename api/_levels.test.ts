import { expect, test } from "vitest";
import { validLevels } from "./_levels.js";

const ok = { id: 201, diff: "easy", es: "Hola mundo", en: "Hello world" };
test("acepta niveles bien formados", () => expect(validLevels({ levels: [ok] })).toEqual([ok]));
test("rechaza ids repetidos, dificultad rara y textos vacíos", () => {
  expect(validLevels({ levels: [ok, ok] })).toBeNull();
  expect(validLevels({ levels: [{ ...ok, diff: "x" }] })).toBeNull();
  expect(validLevels({ levels: [{ ...ok, es: "" }] })).toBeNull();
  expect(validLevels({ levels: "no" })).toBeNull();
});
test("un nivel oculto no necesita texto", () => expect(validLevels({ levels: [{ id: 3, diff: "easy", es: "", en: "", hidden: true }] })?.[0].hidden).toBe(true));
