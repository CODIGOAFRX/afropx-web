# Operaciones

## Contenido, lanzamientos y contacto

Edita `config/site.js` y ejecuta `npm run verify`.

- `site`: correos, teléfono, dominio y zona.
- `social`: perfiles oficiales.
- `releases`: portada, copy, canciones y enlaces.
- `smartLinks.platforms`: plataformas visibles.

Cuando exista el enlace del álbum en YouTube, rellena `releases[0].links.youtube`. La landing dejará de mostrar “Disponible pronto” automáticamente.

Para un nuevo lanzamiento:

1. añade su objeto a `releases`;
2. añade portada y variantes en `assets/images`;
3. crea su landing si necesita una campaña propia;
4. actualiza smart links y UTM;
5. regenera sitemap y metadatos si existe una ruta nueva;
6. ejecuta build y QA responsive.

## Servicios y precios

Los servicios viven en `SITE_CONFIG.mixing.services`.

- Importes fijos se expresan en céntimos: `8000` = 80 €.
- Si no existe tarifa cerrada, usa `priceCents: null` y `priceLabel: "Presupuesto personalizado"`.
- `bookable: true` habilita el servicio.
- `durationMinutes` define duración fija.
- `provisionalDuration: true` usa la duración global editable desde D1.

No publiques un precio inventado. El snapshot de nombre, precio y moneda se copia a cada reserva para conservar el histórico.

## Horario

Semilla actual:

- lunes a viernes: desde las 17:00, último inicio provisional a las 21:00;
- sábado y domingo: de 09:00 a 17:00 como último inicio;
- zona: `Europe/Madrid`;
- intervalo y duración provisionales: 60 minutos;
- buffer: 0.

Confirma el último inicio entre semana y la duración antes de producción.

Después del primer despliegue, usa `/admin/` → “Horario y duración”. Guardar en el panel elimina la marca provisional. Cambiar reglas no mueve reservas existentes.

## Bloquear o abrir fechas

- **Bloqueo:** fecha completa dejando horas vacías, o franja con inicio y fin.
- **Excepción cerrada:** guarda una fecha sin activar “Abrir con horario especial”.
- **Excepción abierta:** activa la casilla y define inicio y último inicio.

Una sesión se oculta si cualquier parte de su duración o buffer solapa un bloqueo.

## Gestionar reservas

Estados permitidos:

```text
pending → confirmed → completed
pending → rejected
pending/confirmed → cancelled
```

Rechazar o cancelar libera los slots. Las transiciones terminales no se reabren para evitar inconsistencias; si hace falta, crea una reserva nueva.

Desde el detalle se pueden guardar notas privadas y reenviar correos. El CSV respeta los filtros activos. El panel no debe compartirse ni enlazarse públicamente.

## Correos

Si una reserva existe pero el correo aparece `failed`:

1. confirma que el dominio está verificado en Resend;
2. revisa `RESEND_FROM_EMAIL` y `RESEND_API_KEY`;
3. abre la reserva;
4. pulsa “Reenviar correos”;
5. revisa el nuevo registro.

El fallo de correo nunca elimina una solicitud guardada.

## QR

`/herramientas/qr/` trabaja en el navegador.

- exige URL HTTP/HTTPS;
- avisa de bajo contraste;
- exporta PNG y SVG;
- acepta logo local de hasta 2 MB;
- recomienda corrección H con logo.

Escanea siempre el archivo final en dos dispositivos antes de imprimir.

## Tarjetas

`/herramientas/tarjetas/` exporta:

- historia 1080×1920;
- post vertical 1080×1350;
- cuadrado 1080×1080;
- horizontal 1280×720.

Portada y datos se procesan localmente. Comprueba la zona segura y la legibilidad del QR tras descargar.

## Spotify, YouTube y Stripe

El modo manual es el comportamiento estable:

- actualiza URLs en `config/site.js`;
- no hace falta una API para smart links;
- `music-providers.js` reserva la interfaz de adaptadores.

Para Spotify o YouTube futuros, usa una Function como proxy y guarda las claves en Cloudflare; nunca las envíes al navegador.

Stripe está deshabilitado. Antes de activarlo hacen falta precios cerrados, términos, política de devolución, webhook verificado, tabla de eventos y pruebas en modo test.

## Problemas frecuentes

| Síntoma | Comprobación |
| --- | --- |
| “Sistema no configurado” | binding `DB` y migración remota |
| No aparecen horas | reglas, bloqueos, excepción, duración y fecha pasada |
| `SLOT_UNAVAILABLE` | otra reserva ganó la carrera; refrescar |
| Turnstile falla | hostname, site key, secret y bypass `false` |
| Panel 401/403 | `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, D1, `RATE_LIMIT_SALT` y, si se usa, Access |
| Panel 503 | faltan D1, `RATE_LIMIT_SALT` o los secretos de administración |
| Correos `disabled` | no hay `RESEND_API_KEY` |
| Correos `failed` | dominio/remitente/API key de Resend |
| Cambio CSS no visible | ejecutar build; las URLs versionadas cambian por contenido |
| 404 en una ruta | comprobar que termina en `/` y que existe `index.html` |
