import { expect, test } from "vitest";
import { CONCEPT } from "./versions/concept";
import { PRODUCTION } from "./versions/production";
import { TEST } from "./versions/test";

const cmp = (a: string, b: string) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

test("las versiones tienen formato 0.0.0 y van en orden dentro de cada entorno", () => {
  for (const list of [PRODUCTION, TEST, CONCEPT]) {
    for (const e of list) { expect(e.version).toMatch(/^\d+\.\d+\.\d+$/); expect(e.es && e.en).toBeTruthy(); }
    for (let i = 1; i < list.length; i++) expect(cmp(list[i - 1].version, list[i].version)).toBeLessThan(0);
  }
});
test("pruebas y conceptos continúan después de producción", () => {
  const last = PRODUCTION[PRODUCTION.length - 1].version;
  if (TEST.length) expect(cmp(last, TEST[0].version)).toBeLessThan(0);
  expect(cmp(last, CONCEPT[0].version)).toBeLessThan(0);
});
