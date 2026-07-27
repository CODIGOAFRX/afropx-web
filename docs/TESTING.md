# Pruebas

## Automatizadas

```powershell
npm ci
npm run verify
npm audit
```

`npm run verify` ejecuta:

1. optimización y bundle;
2. versionado de assets;
3. auditoría de HTML, canónicas, recursos y enlaces;
4. generación de `dist/`;
5. lint del proyecto y TypeScript estricto;
6. Vitest.

Cobertura funcional actual:

- invierno, verano y cambio DST de `Europe/Madrid`;
- fechas válidas y no existentes;
- reglas laborables y de fin de semana;
- bloqueos completos, parciales y solapes de duración;
- excepciones cerradas y especiales;
- duración y buffer;
- validación/saneado de reservas;
- reserva idempotente;
- carrera de doble reserva;
- validación, contraste y nombres de archivo QR.
- contraseña administrativa, cookie firmada y rechazo de cookies manipuladas.

## Prueba local completa

```powershell
Copy-Item wrangler.example.jsonc wrangler.jsonc
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Comprueba:

1. entra en `/mixing/reservar/?service=remote-mix-master`;
2. confirma servicio preseleccionado;
3. elige día y hora;
4. completa datos de prueba;
5. acepta privacidad;
6. revisa resumen;
7. envía;
8. confirma ID legible;
9. abre `/admin/` y confirma que redirige al acceso privado;
10. prueba una contraseña incorrecta y comprueba la pantalla de denegación;
11. entra con la contraseña local y localiza la reserva;
12. intenta repetir exactamente la franja con otro ID y confirma `409`;
13. cancela/rechaza y comprueba que la hora vuelve a quedar libre.

En local, el correo aparecerá `disabled` si no añades una key de Resend. Es el comportamiento previsto.

## Matriz responsive manual

Revisar como mínimo:

- 390×844;
- 768×1024;
- 1280×720;
- 1440×900.

Rutas:

- `/`
- `/mixing/`
- `/mixing/reservar/`
- `/lanzamientos/`
- landing del álbum
- `/escuchar/`
- `/herramientas/qr/`
- `/herramientas/tarjetas/`
- `/admin/`
- las tres páginas legales
- una ruta inexistente

En cada una:

- sin scroll horizontal visible;
- un solo `h1`;
- controles con nombre accesible;
- foco de teclado visible;
- menú móvil usable;
- imágenes con `alt` y carga correcta;
- consola sin errores;
- reduced motion razonable.

## QR y tarjetas

- URL inválida desactiva descargas.
- Contraste 1:1 muestra aviso.
- PNG y SVG conservan margen.
- Logo grande o inválido se rechaza.
- Formatos de tarjeta tienen las dimensiones exactas.
- Los textos largos no salen de la zona segura.
- QR incluido se puede escanear desde el PNG final.

## Producción

Después del despliegue:

- comprueba status y JSON de cada API;
- crea una reserva controlada;
- confirma ambos correos;
- verifica en una ventana privada que `/admin/` pide contraseña;
- confirma que `/api/admin/*` no es accesible sin una sesión válida;
- ejecuta una prueba de dos envíos simultáneos a la misma franja;
- revisa cabeceras con DevTools;
- valida JSON-LD y sitemap;
- comprueba 404 y canónicas.
