import { expect, test } from "vitest";
import { compareScore, decode, encode, verdict } from "./challenge";

test("el reto viaja en el enlace y se valida al abrirlo", () => {
  const c = { kind: "level" as const, id: 3, nick: "Ana María", wpm: 80, acc: 96, score: 77 };
  const url = encode(c, "https://x.app");
  expect(decode(new URL(url).hash)).toEqual(c);
  expect(decode("#reto=time.0.100.99.4500.Beto")).toEqual({ kind: "time", id: 0, nick: "Beto", wpm: 100, acc: 99, score: 4500 });
  expect(decode("#reto=level.999.80.96.77.Ana")).toBeNull(); // nivel que no existe
  expect(decode("#reto=level.3.900.96.77.Ana")).toBeNull(); // velocidad imposible
  expect(decode("#reto=level.3.80.96.77.%E0%A4%A")).toBeNull(); // texto roto
  expect(decode("#reto=level.3.80.96.77.%3Cb%3E")).toMatchObject({ nick: "b" }); // sin etiquetas
  expect(decode("#otra=cosa")).toBeNull();
});

test("comparar y decidir quién gana", () => {
  expect(compareScore("level", 80, 95, 0)).toBe(76);
  expect(compareScore("time", 80, 95, 4100)).toBe(4100);
  expect([verdict(80, 70), verdict(60, 70), verdict(70, 70)]).toEqual(["win", "lose", "tie"]);
});
