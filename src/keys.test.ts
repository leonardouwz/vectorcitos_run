import { expect, test } from "vitest";
import { locate } from "./keys";

test("dedo y tecla de cada letra", () => {
  expect(locate("f", "es")).toEqual({ key: "2-3", finger: 3 });
  expect(locate("j", "en")).toEqual({ key: "2-6", finger: 4 });
  expect(locate(" ", "es")).toEqual({ key: "sp", finger: 8 });
  expect(locate("ñ", "es")).toEqual({ key: "2-9", finger: 7 });
  expect(locate("é", "es")).toEqual({ key: "1-2", finger: 2 }); // la tilde se escribe sobre la "e"
  expect(locate("A", "es")).toEqual({ key: "2-0", finger: 0, shift: "sr" }); // mayúscula: Mayús con la otra mano
  expect(locate("L", "en")).toEqual({ key: "2-8", finger: 6, shift: "sl" });
  expect(locate("5", "en")).toEqual({ key: "0-4", finger: 3 });
  expect(locate("%", "en")).toEqual({ key: "0-4", finger: 3, shift: "sr" });
  expect(locate("¿", "es")).toBeNull(); // lo que no se sabe no se resalta
});
