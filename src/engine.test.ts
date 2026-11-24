import { expect, test } from "vitest";
import { Round, summarize } from "./engine";

test("frase completa: errores, racha, estrellas y ppm", () => {
  const r = new Round("el sol");
  expect(r.key("e", 0)).toBe("ok");
  expect(r.key("x", 500)).toBe("error"); // no avanza
  expect(r.key("l", 1000)).toBe("ok");
  expect(r.key(" ", 1500)).toBe("word");
  expect(r.streak).toBe(2);
  expect(r.key("s", 2000)).toBe("ok");
  expect(r.key("o", 2500)).toBe("ok");
  expect(r.key("l", 6000)).toBe("done");
  expect(r.errors).toBe(1);
  expect(r.firstTry).toBe(5); // la "l" tras el fallo no cuenta
  expect(r.accuracy).toBeCloseTo(5 / 6);
  expect(r.stars).toBe(1);
  expect(r.wpm).toBe(Math.round(6 / 5 / (6 / 60)));
  expect(r.key("x", 7000)).toBe("none");
  expect(r.missedWords).toEqual(["el"]);
  expect(r.missedChars).toEqual({ l: 1 });
  expect(new Round("a").key("a", 0)).toBe("done");
});

test("resumen de varias frases, también si la última queda a medias", () => {
  const a = new Round("ab"), b = new Round("cd");
  a.key("a", 0); a.key("x", 1); a.key("b", 2); // 1 fallo en "ab"
  b.key("c", 3); // "cd" queda a medias
  const s = summarize([a, b], 60);
  expect(s).toMatchObject({ chars: 3, firstTry: 2, errors: 1, phrases: 1, wpm: Math.round(3 / 5) });
  expect(s.acc).toBeCloseTo(2 / 3);
  expect(s.missedWords).toEqual(["ab"]);
});
