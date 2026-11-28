import { defineConfig } from "vite";

// Entorno de la versión que se ve en el inicio: producción (main), conceptos (claude/conceptos) o pruebas (cualquier otra vista previa).
const env = process.env;
const channel = env.VERCEL_ENV === "production" ? "production" : env.VERCEL_GIT_COMMIT_REF === "claude/conceptos" ? "concept" : env.VERCEL ? "test" : "dev";

// El número de compilación hace que el service worker renueve su caché en cada publicación.
export default defineConfig({ define: { __BUILD__: JSON.stringify(Date.now().toString(36)), __CHANNEL__: JSON.stringify(channel) } });
