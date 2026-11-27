import { timingSafeEqual } from "node:crypto";

/** La clave de administrador (variable ADMIN_KEY) llega en la cabecera x-admin-key. */
export function isAdmin(request: Request) {
  const key = process.env.ADMIN_KEY, given = request.headers.get("x-admin-key");
  if (!key || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
