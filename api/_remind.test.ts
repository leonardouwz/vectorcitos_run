import { expect, test } from "vitest";
import { messageFor, validSub, type Sub } from "./_remind.js";

const now = Date.parse("2026-11-25T20:00:00Z");
const base: Sub = { sub: { endpoint: "https://x/y", keys: { p256dh: "a", auth: "b" } }, lang: "es", last: "", streak: 0, ts: now };

test("no avisa a quien ya jugó hoy", () => expect(messageFor({ ...base, last: "2026-11-25" }, now)).toBeNull());
test("avisa de la racha en peligro", () => expect(messageFor({ ...base, last: "2026-11-24", streak: 5 }, now)?.title).toContain("5"));
test("aviso normal sin racha", () => expect(messageFor(base, now)?.title).toContain("reto diario"));
test("no insiste a quien se fue", () => expect(messageFor({ ...base, ts: now - 20 * 864e5 }, now)).toBeNull());
test("valida la suscripción", () => {
  expect(validSub({ sub: { endpoint: "http://x", keys: { p256dh: "a", auth: "b" } } })).toBeNull();
  expect(validSub({ sub: base.sub, lang: "en", last: "2026-11-24", streak: 3 })?.lang).toBe("en");
});
