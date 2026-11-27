import { isAdmin } from "./_admin.js";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** POST con la clave en x-admin-key: dice si es válida (para abrir el modo desarrollador en el juego). */
export async function POST(request: Request) {
  if (isAdmin(request)) return json({ ok: true });
  await new Promise((r) => setTimeout(r, 800)); // frena los intentos de adivinar la clave
  return json({ error: "unauthorized" }, 401);
}
