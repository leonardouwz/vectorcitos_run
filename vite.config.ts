import { defineConfig } from "vite";

// El número de versión hace que el service worker renueve su caché en cada publicación.
export default defineConfig({ define: { __BUILD__: JSON.stringify(Date.now().toString(36)) } });
