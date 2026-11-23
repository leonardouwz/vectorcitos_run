import { expect, test } from "vitest";
import { Round } from "./engine";

test("ronda completa: errores, estrellas y ppm", () => {
  const r = new Round(["el", "sol", "brilla"]);
  expect(r.type("e", 0)).toBe("ok");
  expect(r.type("el", 1000)).toBe("word");
  expect(r.type("x", 1500)).toBe("error");
  expect(r.type("xy", 1600)).toBe("none"); // mismo tropiezo, no suma
  expect(r.type("sol", 2000)).toBe("word"); // fallada: no cuenta a la primera
  expect(r.type("brilla", 12000)).toBe("done");
  expect(r.errors).toBe(1);
  expect(r.firstTry).toBe(2);
  expect(r.stars).toBe(3); // 2/3 a la primera
  expect(r.wpm).toBe(Math.round(13 / 5 / (12 / 60)));
  expect(r.type("x", 13000)).toBe("none");
});
