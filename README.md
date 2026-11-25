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

## Modos de juego
- **Niveles** (fácil, intermedio, difícil) y **Práctica** de teclas.
- **Reto diario:** tres frases (fácil, media, difícil), iguales para todo el mundo ese día (fecha UTC). Cuenta días seguidos.
- **Contrarreloj:** 60 segundos, frases sin fin. Cada letra acertada suma 10 puntos y cada error resta 5.
- Todas empiezan con cuenta regresiva (3, 2, 1, ¡YA!).

## Ideas que vinieron del buzón
- **Guía de dedos:** pantalla "Cómo colocar los dedos" (la primera vez y desde el mapa) y un teclado en el juego con el color de cada dedo y la próxima tecla resaltada (`src/keys.ts`). Se puede apagar con el botón ⌨️.
- **Monedas, regalo diario y tienda:** cada partida da monedas; el regalo diario sube con la racha del reto diario; en la tienda se compran accesorios que se ven en la escena 3D. Para añadir un accesorio: una entrada en `src/cosmetics.ts` y su modelo en `src/scene.ts`.
- **Retar a un amigo:** al terminar un nivel o la contrarreloj, el botón 🤝 genera un enlace con tu marca (`#reto=...`). Quien lo abre juega lo mismo y ve quién ganó. No usa servidor.

## Buzón de sugerencias
Los jugadores escriben desde 💌 en el inicio o en el mapa. El mensaje va a `api/suggest.ts`, que lo guarda en un almacén **privado** de Vercel Blob (tope de 200 por día y campo trampa contra bots).
Para leerlos abre `https://TU-DOMINIO/api/inbox?key=TU_CLAVE`, donde la clave es la variable de entorno `ADMIN_KEY` del proyecto en Vercel. Con `&format=json` los obtienes como datos. Además de `ADMIN_KEY`, hace falta `BLOB_READ_WRITE_TOKEN`, que Vercel crea al conectar el almacén.

## Ranking y salas
En 🏆 el jugador decide (apagado por defecto) si su apodo y sus puntos del reto diario y de la contrarreloj aparecen en la tabla **mundial** y, si escribe un código de **sala**, en la tabla de esa sala. Un docente o grupo solo tiene que compartir un código (3 a 12 letras o números).
- No hay cuentas ni contraseñas: cada dispositivo genera un código privado y solo envía una huella suya. Cualquiera puede borrar sus marcas desde el mismo botón.
- Las marcas las envía el navegador, así que el servidor solo descarta valores absurdos (`api/_rank.ts`): no impide hacer trampa.
- Cada marca vive en un archivo de Vercel Blob cuyo nombre contiene el puntaje (`api/rank.ts`), sin base de datos.
- Moderación: `https://TU-DOMINIO/api/rank?remove=ID&key=TU_CLAVE` borra a un jugador de todas las tablas (el `ID` sale en la respuesta JSON de `/api/rank?board=daily`).

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/engine.ts` | Reglas: palabras, errores, estrellas, palabras por minuto |
| `src/content.ts` | Niveles y frases en español e inglés |
| `src/i18n.ts` | Textos de la interfaz |
| `src/store.ts` | Jugadores, avance, historial y racha (localStorage) |
| `src/keys.ts` | Dedos y teclado de ayuda |
| `src/cosmetics.ts` | Accesorios, monedas y regalo |
| `src/challenge.ts` | Retos entre amigos por enlace |
| `src/modes.ts` | Reto diario, días seguidos y frases de la contrarreloj |
| `src/online.ts` | Envío y lectura del ranking |
| `api/` | Buzón de sugerencias y ranking (funciones de Vercel) |
| `src/scene.ts` | Escena 3D y personaje |
| `src/audio.ts` | Efectos y música |
| `src/ui.ts`, `src/style.css` | Pantallas y estilo (ver la guía de marca) |

## Ampliar el juego

- **Más niveles o frases:** añade entradas **al final** de cada lista en `src/content.ts` (siempre `es` y `en`). El orden fija el número de nivel y el avance guardado de los jugadores. Hay 10 frases por dificultad y una pestaña de **Práctica** (fila central, superior, inferior, números, símbolos, acentos) que siempre está abierta.
- **Otro idioma:** añade el código a `Lang` en `content.ts` y un bloque en `i18n.ts`.
- **Modelo 3D propio del personaje:** guarda un archivo glTF/GLB como `public/models/vectorcito.glb`. Si existe, reemplaza al personaje básico. Para decorados, carga más modelos desde `src/scene.ts` con `GLTFLoader`.
- **Música y sonidos propios:** pon tus archivos en `public/audio/` y reprodúcelos desde `src/audio.ts` (`new Audio("/audio/tema.mp3")`) en lugar de las notas generadas.

## Seguridad y datos
Esta versión **no guarda contraseñas ni credenciales**. La versión original (2024, proyecto universitario) usaba una base de datos con una clave escrita en el código. Esa clave sigue visible en el historial de git: si alguna vez se usó en un servidor real, **cámbiala**.

## Créditos
Proyecto original de Universidad La Salle (Ingeniería de Software, 2024B). Integrantes: Piero Fabricio Poblete Andía, Katherine Naomi Saico Ccahuana, Allison Mayra Usedo Quispe, Leonardo Raphael Pachari Gomez y Nicolle Andrea Lozano Vega. Docente: Richart Smith Escobedo Quispe.
Presentación del proyecto: [assets/vectorcitos_run_ppt.pdf](assets/vectorcitos_run_ppt.pdf). Historial de commits original: <https://github.com/leonardouwz/lp3_vectorcitos/tree/main/lab05%20ev4/Consola>.
