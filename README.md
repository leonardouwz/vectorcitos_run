# Vectorcitos Run

Juego de mecanografía con niveles, estrellas y una escena 3D. · *A typing game with levels, stars and a 3D scene.*

Disponible en **español** e **inglés** (se elige solo por el idioma del navegador y se puede cambiar dentro del juego).

![Póster](assets/vectorcitos_run_poster.png)

## Jugar / Run

```bash
npm install
npm run dev      # juego en http://localhost:5173
npm test         # reglas del juego
npm run build    # versión final en dist/
```

Tecnología: TypeScript, Vite y Three.js (3D). El sonido se genera en vivo con Web Audio.

## Cómo se juega
Escribe la frase completa, letra por letra, directamente con el teclado (sin cajas de texto; en celular, toca la pantalla para abrir el teclado). Una tecla equivocada no avanza. Las estrellas dependen de cuántas letras aciertas a la primera (95 % o más → 3★, 85 % o más → 2★, resto → 1★). Terminar un nivel abre el siguiente. El avance se guarda **en el dispositivo**, por jugador (nombre). No hay contraseñas ni servidor.

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/engine.ts` | Reglas: palabras, errores, estrellas, palabras por minuto |
| `src/content.ts` | Niveles y frases en español e inglés |
| `src/i18n.ts` | Textos de la interfaz |
| `src/store.ts` | Jugadores, avance e idioma (localStorage) |
| `src/scene.ts` | Escena 3D y personaje |
| `src/audio.ts` | Efectos y música |
| `src/ui.ts`, `src/style.css` | Pantallas y estilo (ver la guía de marca) |

## Ampliar el juego

- **Más niveles o frases:** añade entradas en `src/content.ts` (siempre `es` y `en`).
- **Otro idioma:** añade el código a `Lang` en `content.ts` y un bloque en `i18n.ts`.
- **Modelo 3D propio del personaje:** guarda un archivo glTF/GLB como `public/models/vectorcito.glb`. Si existe, reemplaza al personaje básico. Para decorados, carga más modelos desde `src/scene.ts` con `GLTFLoader`.
- **Música y sonidos propios:** pon tus archivos en `public/audio/` y reprodúcelos desde `src/audio.ts` (`new Audio("/audio/tema.mp3")`) en lugar de las notas generadas.

## Seguridad y datos
Esta versión **no guarda contraseñas ni credenciales**. La versión original (2024, proyecto universitario) usaba una base de datos con una clave escrita en el código. Esa clave sigue visible en el historial de git: si alguna vez se usó en un servidor real, **cámbiala**.

## Créditos
Proyecto original de Universidad La Salle (Ingeniería de Software, 2024B). Integrantes: Piero Fabricio Poblete Andía, Katherine Naomi Saico Ccahuana, Allison Mayra Usedo Quispe, Leonardo Raphael Pachari Gomez y Nicolle Andrea Lozano Vega. Docente: Richart Smith Escobedo Quispe.
Presentación del proyecto: [assets/vectorcitos_run_ppt.pdf](assets/vectorcitos_run_ppt.pdf). Historial de commits original: <https://github.com/leonardouwz/lp3_vectorcitos/tree/main/lab05%20ev4/Consola>.
