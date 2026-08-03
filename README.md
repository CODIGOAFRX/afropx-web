# AfroPX Web

Web oficial de **AfroPX** y plataforma de reservas de **Pedro / Audio**. El proyecto reúne la identidad artística, los lanzamientos y los servicios de mezcla y mastering en una experiencia editorial de alto contraste: negro, blanco y rojo.

Producción: [afropxmusic.com](https://afropxmusic.com/)

## Estado actual

El proyecto está desplegado y operativo en producción sobre Cloudflare Pages.

| Componente | Estado |
| --- | --- |
| Web pública y dominio personalizado | Activo |
| Lanzamientos y smart links | Activo |
| Calendario y reservas | Activo |
| Cloudflare D1 | Vinculado y migrado |
| Cloudflare Turnstile | Activo |
| Panel privado | Protegido con contraseña y sesión firmada |
| Correos transaccionales con Resend | Activos y verificados |
| Pagos online | Desactivados |

## Qué incluye

- Web artística responsive con música, historia, archivo visual y enlaces oficiales.
- Archivo de lanzamientos y landing de *A la gente buena le pasan cosas malas*.
- Smart links propios en `/escuchar/`, sin depender de Linktree.
- Área profesional de Mixing con servicios, tarifas, trabajos, proceso y FAQ.
- Calendario de reservas conectado a disponibilidad real en `Europe/Madrid`.
- Panel privado para administrar agenda, solicitudes y correos.
- Correos automáticos de recepción y confirmación mediante Resend.
- Herramientas locales para crear códigos QR y tarjetas promocionales.
- Analítica agregada propia, sin cookies publicitarias ni datos personales.
- SEO técnico, sitemap, datos estructurados, páginas legales y cabeceras de seguridad.

## Rutas principales

| Ruta | Contenido |
| --- | --- |
| `/` | Web oficial de AfroPX |
| `/lanzamientos/` | Archivo de lanzamientos |
| `/lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/` | Landing del álbum |
| `/escuchar/` | Smart links oficiales |
| `/mixing/` | Servicios de Pedro / Audio |
| `/mixing/reservar/` | Calendario y solicitud de reserva |
| `/admin/` | Panel privado de reservas |
| `/herramientas/qr/` | Generador de códigos QR |
| `/herramientas/tarjetas/` | Generador de tarjetas para redes |

## Calendario y reservas

La reserva pública funciona en cinco pasos:

1. selección del servicio;
2. selección de una fecha disponible;
3. selección de una hora;
4. datos del cliente y del proyecto;
5. revisión y envío de la solicitud.

La disponibilidad se calcula en servidor teniendo en cuenta:

- reglas semanales configurables;
- zona horaria `Europe/Madrid`;
- duración del servicio y margen entre sesiones;
- fechas o franjas bloqueadas;
- excepciones con horarios especiales;
- reservas que ya ocupan una franja;
- límite de meses visibles definido desde administración.

D1 mantiene una clave única por cada slot de agenda. La reserva y sus slots se escriben juntos, evitando que dos personas puedan reservar la misma hora aunque envíen la solicitud simultáneamente.

### Estados de una reserva

```text
pending → confirmed → completed
pending → rejected
pending/confirmed → cancelled
```

- Una solicitud nueva queda pendiente hasta que Pedro la revise.
- Confirmar desde el panel envía automáticamente un correo de confirmación al cliente.
- Rechazar o cancelar libera las horas ocupadas.
- Los correos pueden reenviarse manualmente y cada intento queda registrado en D1.

## Panel privado

`/admin/` está protegido mediante contraseña validada exclusivamente en servidor. Al iniciar sesión se crea una cookie firmada `HttpOnly`, `Secure` y `SameSite=Strict` con duración limitada.

Desde el panel se puede:

- consultar el resumen de solicitudes;
- buscar y filtrar reservas;
- abrir el detalle de cada proyecto;
- confirmar, rechazar, cancelar o completar una reserva;
- guardar notas privadas;
- revisar y reenviar correos;
- crear bloqueos de día completo o por franja;
- definir excepciones para fechas concretas;
- editar el horario semanal, duración, buffer y horizonte del calendario;
- exportar las reservas filtradas a CSV.

Las mutaciones privadas validan el origen y se registran en `admin_audit`. Los intentos de acceso se limitan mediante contadores en D1.

## Correos

Resend utiliza el dominio verificado `afropxmusic.com`.

El sistema envía:

- un aviso interno cuando llega una solicitud;
- un acuse de recepción al cliente;
- un correo específico cuando la reserva se confirma.

El resultado de cada envío se guarda como `sent`, `failed` o `disabled`. Un fallo de correo nunca elimina una reserva que ya se haya guardado.

## Infraestructura

```text
Navegador
  ├─ Sitio multipágina HTML/CSS/JS
  ├─ Calendario y formulario de reserva
  └─ Panel privado
          │
          ▼
Cloudflare Pages Functions
  ├─ validación y rate limiting
  ├─ sesiones administrativas
  ├─ cálculo de disponibilidad
  ├─ verificación Turnstile
  └─ envío mediante Resend
          │
          ▼
Cloudflare D1
  ├─ reservas y slots
  ├─ horarios, bloqueos y excepciones
  ├─ registros de correo
  └─ auditoría y analítica agregada
```

El directorio público generado es `dist/`. El código de servidor, las migraciones, los tests, las dependencias y los secretos no se publican como archivos estáticos.

## Inicio rápido local

Requisitos: Node.js 22 o posterior.

```powershell
npm ci
Copy-Item wrangler.example.jsonc wrangler.jsonc
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Abre `http://127.0.0.1:8788/`.

Los bypasses locales de Turnstile y administración solo funcionan con `ENVIRONMENT=development`. No copies secretos de producción a `.dev.vars`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Construye y abre Pages Functions con D1 local |
| `npm run build` | Optimiza imágenes, empaqueta JS, versiona assets y genera `dist/` |
| `npm run check` | Audita HTML, canónicas, recursos y enlaces internos |
| `npm run images` | Regenera variantes WebP responsive |
| `npm run typecheck` | Comprueba TypeScript |
| `npm run lint` | Ejecuta tipos y auditoría estática |
| `npm test` | Ejecuta Vitest |
| `npm run verify` | Ejecuta build, tipos, auditoría y tests |
| `npm run db:migrate:local` | Aplica migraciones a D1 local |
| `npm run db:migrate:remote` | Aplica migraciones a D1 de producción |

## Configuración

### Contenido público

Edita [config/site.js](config/site.js) para modificar:

- identidad, contacto y redes sociales;
- lanzamientos, enlaces y canciones;
- servicios, precios, trabajos y FAQ;
- valores iniciales del calendario;
- smart links y eventos analíticos permitidos.

Los horarios guardados desde el panel viven en D1 y prevalecen sobre la configuración inicial.

### Variables y secretos

Producción utiliza, entre otros:

- `DB` como binding de Cloudflare D1;
- `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET`;
- `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`;
- `RESEND_API_KEY` y `RESEND_FROM_EMAIL`;
- `BOOKING_NOTIFICATION_EMAIL`;
- `RATE_LIMIT_SALT`;
- `ALLOWED_ORIGINS`.

Nunca añadas valores reales al repositorio, al README, a `config/site.js` ni a capturas de pantalla. Las claves expuestas deben revocarse y sustituirse.

## Estructura principal

```text
admin/                 panel privado y acceso
assets/                estilos, imágenes, JS fuente y bundles
config/site.js         contenido y configuración central
functions/             Cloudflare Pages Functions
migrations/            esquema y semilla de D1
mixing/reservar/       calendario público de reservas
escuchar/              smart links
herramientas/          QR y tarjetas promocionales
legal/                 privacidad, aviso legal y cookies
scripts/               build, imágenes y comprobaciones
tests/                 pruebas unitarias y de integración
dist/                  salida pública generada
```

## Calidad y seguridad

La verificación automatizada cubre, entre otros:

- cálculo de disponibilidad y zona horaria;
- validación y saneado de solicitudes;
- idempotencia y prevención de reservas dobles;
- persistencia en D1;
- contraseña administrativa y cookies firmadas;
- correo automático al confirmar una reserva;
- generación y lectura de QR;
- integridad de rutas y recursos públicos.

Antes de subir cambios:

```powershell
npm run verify
```

## Despliegue

La rama de producción es `main`. Un push a GitHub inicia automáticamente un despliegue de Cloudflare Pages.

Antes de desplegar:

1. ejecuta `npm run verify`;
2. revisa que no haya secretos ni archivos locales preparados para commit;
3. aplica cualquier migración nueva a D1;
4. comprueba el despliegue y una ruta de API real;
5. realiza una prueba controlada del flujo afectado.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Configuración de Cloudflare, D1, Resend y Turnstile](docs/CLOUDFLARE-SETUP.md)
- [Operación del calendario y las reservas](docs/OPERATIONS.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Pruebas](docs/TESTING.md)
- [Checklist de despliegue](docs/DEPLOYMENT-CHECKLIST.md)
- [Decisiones técnicas](docs/DECISIONS.md)
- [Registro de archivos](docs/CHANGELOG-FILES.md)

## Datos públicos

- Artista: AfroPX — Instagram `@afrxpx`
- Correo artístico y de reservas: `contacto@afropxmusic.com`
- Mixing: Pedro — activo desde 2018
- Correo profesional de audio: `itsafrxpx@gmail.com`
- Estudio: `@afrxstudios`
- Teléfono: `685 585 342`

No hay pagos activos. Stripe permanece deshabilitado hasta que existan condiciones comerciales, política de devoluciones y pruebas específicas del flujo de cobro.
