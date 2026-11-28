# Vectorcitos Run: notas para quien trabaje en el proyecto

## Ramas (acordado con el dueño del proyecto)

- `main`: producción (https://vectorcitos-run.vercel.app). Solo entra lo aprobado, por pull request y cuando el dueño pide el merge.
- `claude/zen-albattani-tmnejk`: **ideas estructuradas** (mejoras ya definidas). Vista previa: https://vectorcitos-run-git-claude-zen-alba-b0cadc-leonardouwz-projects.vercel.app
- `claude/conceptos`: **ideas conceptuales y pruebas** (experimentos como el modo Esquiva). No se mezcla con `main` sin que el dueño lo decida. Vista previa: https://vectorcitos-run-git-claude-conceptos-leonardouwz-projects.vercel.app
- Cuando una mejora estructurada también sirve al concepto (o al revés), se pasa a la otra rama con un merge y se avisa.
- No se hace merge a `main` sin que el dueño lo pida de forma explícita.

## Otros acuerdos

- Idiomas: español e inglés en todo texto del juego (`src/i18n.ts`).
- Vercel: proyecto `vectorcitos-run`; `ADMIN_KEY`, `VAPID_*` y `CRON_SECRET` ya están configuradas.
- Los créditos de Higgsfield son limitados: generar solo lo necesario.

## Versiones (v0.0.0)

- Formato `v0.0.0`: 1.º = temporada o cambio realmente grande (la `v1.0.0` será el lanzamiento oficial; ahí se añade la ventana de «novedades de la versión»); 2.º = mecánicas y novedades; 3.º = arreglos y cambios pequeños. Solo cuentan cambios significativos o pequeños de verdad, no cada commit.
- Cada entorno cuenta aparte y su lista de cambios vive en `src/versions/`: `production.ts` (`main`), `test.ts` (`claude/zen-albattani-tmnejk`) y `concept.ts` (`claude/conceptos`). Los de pruebas y conceptos parten de la última de producción.
- **Cada vez que se haga un cambio que cuente, añade su entrada en el archivo de la rama en la que se trabaja** (con textos en español e inglés). En pruebas cada cambio sube su propio número (0.8.4 → 0.8.5 → …).
- **En producción solo cuenta el merge**: varios cambios de pruebas se juntan en UNA sola versión de producción. Al hacer merge a `main`, las entradas de `test.ts` se resumen en una única entrada de `production.ts` que sube un paso sobre la última de producción (tercer número si todo es pequeño; segundo si hay una mecánica o novedad), y `test.ts` se vacía. Ejemplo: producción v0.8.3, pruebas llegó a v0.8.5 → tras el merge producción es v0.8.4 (no v0.8.5). Las versiones de producción ya publicadas no se cambian.
- Se muestra abajo a la izquierda solo en el inicio: `v0.8.0` en producción; `v0.8.3 · pruebas` o `· conceptos` en las demás. El entorno se detecta al compilar en Vercel (`vite.config.ts`).

## Ideas futuras (hoja de ruta, aún sin hacer)

- **Sección de skins** (personajes): cambiar al personaje entero, aparte de los cosméticos. Pendiente decidir cuáles; las skins serán **caras**.
- **Claudito**: primera skin pensada, inspirada en la mascota de Claude, pero con un diseño propio y cambios claros para no copiar el original ni infringir derechos de autor (nombre propio, forma y detalles distintos; nada de usar el arte oficial). Solo se consigue **caro** o **al terminar todos los niveles**.
- **Muchos más niveles**: ampliar bastante cada dificultad (hoy hay 10 por dificultad). El editor del modo desarrollador ya permite añadir niveles; cuando haya más, revisar el desbloqueo de Claudito (terminar todos) y el mapa de niveles para listas largas.
- **Más cosméticos** (cabeza, cara, cuerpo, colores y estelas).
- **Ventana de novedades** por versión, al lanzar la v1.0.0.
