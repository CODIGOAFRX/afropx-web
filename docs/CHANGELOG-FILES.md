# Registro de archivos

Registro agrupado de esta ampliación. `dist/`, `.wrangler/`, `.dev.vars`, `wrangler.jsonc` y `node_modules/` son artefactos locales ignorados.

## Creados

- Configuración/build: `config/site.js`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.js`, `.env.example`, `.dev.vars.example`, `wrangler.example.jsonc`, `_routes.json`.
- Scripts: `scripts/build.mjs`, `scripts/check-site.mjs`, `scripts/images.mjs`.
- Backend: `functions/_middleware.ts`, `functions/lib/*`, `functions/api/booking/*`, `functions/api/admin/*`, `functions/api/events.ts`.
- Base de datos: `migrations/0001_initial.sql`.
- Frontend fuente: `assets/js/core/*`, `assets/js/pages/*`, `assets/js/integrations/*`, `assets/css/advanced.css`.
- Bundles: `assets/dist/site.js`, `booking.js`, `smart-links.js`, `qr.js`, `cards.js`, `admin.js`.
- Rutas: `mixing/reservar/`, `escuchar/`, `herramientas/qr/`, `herramientas/tarjetas/`, `admin/`, `legal/*`, `404.html`.
- Tests: `tests/time.test.ts`, `availability.test.ts`, `validation.test.ts`, `booking-integration.test.ts`, `qr.test.ts` y utilidades.
- Documentación: todos los archivos de `docs/`.
- Imágenes: variantes responsive `*-480.webp`, `*-640.webp`, `*-800.webp`, `*-960.webp`, `*-1200.webp` y `*-1400.webp` aplicables.

## Modificados

- `index.html`: smart links, contacto, SEO, datos estructurados, imágenes responsive y navegación.
- `mixing/index.html`: precios reales, reservas, FAQ, schema y contacto.
- `lanzamientos/index.html`: contenido centralizado y acceso a campaña.
- `lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/index.html`: portada final, smart links, compartir y estado YouTube.
- `styles.css`: compatibilidad de componentes, responsive y rendimiento.
- `script.js`: IntersectionObserver, navegación y efectos con `requestAnimationFrame`.
- `_headers`: seguridad, caché y privacidad.
- `robots.txt` y `sitemap.xml`: nuevas rutas y exclusiones.
- `.gitignore`: secrets, estado local y output.
- `README.md` y `GUIA-PUBLICACION.md`: operación actual.

## Eliminados

No se eliminó contenido funcional existente. El iframe de Spotify de la portada se sustituyó por un acceso directo ligero y respetuoso con privacidad; Spotify sigue accesible desde smart links.

## Artefacto generado

`npm run build` crea `dist/` con la lista blanca pública. No debe editarse ni confirmarse manualmente.
