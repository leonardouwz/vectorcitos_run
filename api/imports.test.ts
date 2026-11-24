import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

// En Vercel las funciones corren como módulos ESM: un import relativo sin ".js" rompe la función
// al arrancar (error 500) aunque aquí las pruebas pasen. Esta prueba lo atrapa antes de publicar.
test("los imports relativos de api/ llevan extensión .js", () => {
  const bad: string[] = [];
  for (const f of readdirSync("api").filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))) {
    for (const m of readFileSync(`api/${f}`, "utf8").matchAll(/^import (?!type\b).*from "(\.[^"]+)"/gm)) {
      if (!m[1].endsWith(".js")) bad.push(`${f}: ${m[1]}`);
    }
  }
  expect(bad).toEqual([]);
});
