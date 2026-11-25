import { expect, test } from "vitest";
import { detectOS, kindFor } from "./device-detect";

test("sistema y tipo de dispositivo", () => {
  expect(detectOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 5)).toBe("ios");
  expect(detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe("ios"); // iPad que se hace pasar por Mac
  expect(detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe("mac");
  expect(detectOS("Mozilla/5.0 (Linux; Android 14; Pixel 8)", "Linux armv81", 5)).toBe("android");
  expect(detectOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0)).toBe("windows");
  expect(detectOS("Mozilla/5.0 (X11; Linux x86_64)", "Linux x86_64", 0)).toBe("linux");
  expect([kindFor(true, 390), kindFor(true, 820), kindFor(false, 1080), kindFor(false, 360)]).toEqual(["phone", "tablet", "desktop", "desktop"]);
});
