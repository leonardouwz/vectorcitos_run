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
