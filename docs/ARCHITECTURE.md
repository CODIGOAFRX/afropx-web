# Arquitectura

## Visión general

La plataforma conserva un frontend multipágina ligero y añade backend únicamente donde hace falta.

```text
Navegador
  ├─ HTML/CSS + bundles ESM de dist/
  ├─ POST /api/events ───────────────┐
  └─ /mixing/reservar/               │
       ├─ GET config/disponibilidad  │
       └─ POST reserva + Turnstile   │
                                      ▼
Cloudflare Pages Functions ─────── Cloudflare D1
  ├─ validación y rate limit          ├─ reservas y slots únicos
  ├─ cálculo Europe/Madrid            ├─ horarios, bloqueos y excepciones
  ├─ Resend                           ├─ registro de correos
  └─ API privada bajo Access          ├─ analítica diaria agregada
                                      └─ auditoría administrativa
```

Cloudflare Pages sirve exclusivamente `dist/`. El código fuente, las migraciones, los tests, `node_modules` y los secretos no forman parte del directorio público.

## Capas

### Presentación

- HTML multipágina accesible, sin framework cliente.
- `styles.css` conserva la identidad visual original.
- `assets/css/advanced.css` contiene reservas, smart links, herramientas, administración y legal.
- `script.js` gestiona navegación, revelados y efectos generales.
- `assets/js/` contiene módulos fuente; esbuild genera `assets/dist/*.js`.
- El build añade a cada CSS y JS una versión derivada de su contenido para invalidar caché.

### Configuración y contenido

`config/site.js` es la fuente central para:

- identidad, contacto y redes;
- lanzamientos y enlaces;
- servicios, precios y FAQ;
- reglas iniciales de agenda;
- smart links e integraciones;
- analítica permitida;
- datos legales pendientes.

Los horarios guardados desde administración viven en D1 y sustituyen la semilla inicial sin modificar código.

### API pública

| Ruta | Método | Función |
| --- | --- | --- |
| `/api/booking/config` | GET | Servicios, precios, límites y estado de configuración |
| `/api/booking/availability` | GET | Días y horas realmente disponibles |
| `/api/booking` | POST | Validación, Turnstile, reserva atómica y correos |
| `/api/events` | POST | Incremento analítico diario sin PII |

Todas las respuestas de API usan `no-store`. Las mutaciones públicas exigen un `Origin` permitido.

### API privada

`/admin/*` exige una cookie firmada creada tras verificar la contraseña exclusivamente en servidor. `/api/admin/*` vuelve a validar esa sesión; Cloudflare Access puede mantenerse como segunda capa opcional. El panel permite:

- listar, filtrar y abrir reservas;
- cambiar estado y notas;
- reenviar correos;
- gestionar bloqueos y excepciones;
- editar reglas semanales;
- exportar CSV;
- consultar resumen.

Las mutaciones privadas también validan el origen. Cada acción sensible se registra en `admin_audit`.

## Modelo de datos

- `booking_settings`: zona horaria, intervalo, duración, buffer y horizonte.
- `availability_rules`: regla semanal por día.
- `booking_blocks`: cierres completos o franjas.
- `availability_exceptions`: apertura o cierre especial por fecha.
- `bookings`: snapshot comercial y datos de la solicitud.
- `booking_slots`: bloqueos discretos de agenda.
- `email_log`: resultado de cada envío.
- `rate_limits`: contadores temporales con clave de cliente hasheada.
- `analytics_daily`: recuentos agregados.
- `admin_audit`: historial administrativo.

## Prevención de reserva doble

1. El servidor recalcula disponibilidad justo antes de insertar.
2. Duración y buffer se convierten en una lista de `slot_key` UTC.
3. `booking_slots.slot_key` es clave primaria.
4. Reserva y slots se insertan juntos mediante `D1.batch`.
5. Si dos solicitudes compiten, solo una puede insertar la misma clave; la otra recibe `409 SLOT_UNAVAILABLE`.
6. `client_request_id` es único, de modo que reintentar la misma solicitud es idempotente.
7. Rechazar o cancelar elimina sus slots y libera la agenda.

La zona civil se convierte explícitamente con `Europe/Madrid`; no depende de la zona del Worker.

## Flujo de correos

Después de persistir una reserva:

1. se envía el aviso interno a `contacto@afropxmusic.com`;
2. se envía acuse de recepción al cliente;
3. cada resultado queda en `email_log` y en el estado de la reserva;
4. un fallo de Resend no elimina la reserva;
5. administración puede reintentar los envíos con claves de idempotencia.

## Integraciones musicales y pagos

`assets/js/integrations/music-providers.js` define adaptadores para conservar un modo manual fiable hoy y añadir Spotify o YouTube en una segunda fase. Stripe está deshabilitado; D1 solo reserva campos compatibles con un futuro flujo de pago.

## Decisiones relacionadas

Consulta [DECISIONS.md](DECISIONS.md) para el razonamiento y [SECURITY-PRIVACY.md](SECURITY-PRIVACY.md) para controles y límites.
