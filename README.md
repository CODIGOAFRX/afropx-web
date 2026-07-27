# AfroPX Web

Web oficial de AfroPX y plataforma de trabajo para Pedro / Audio. Mantiene la estética editorial en negro, blanco y rojo e incorpora lanzamientos, smart links, reservas, herramientas promocionales y un panel privado.

Dominio previsto: [afropxmusic.com](https://afropxmusic.com/)

## Estado

La implementación y el build están terminados y funcionan en local. **La reserva no debe activarse en producción** hasta completar los datos legales, crear D1 y configurar Turnstile, Resend y los secretos del panel. Consulta [configuración manual pendiente](docs/MANUAL-PENDING.md) y la [lista previa al despliegue](docs/DEPLOYMENT-CHECKLIST.md).

## Qué incluye

- Web de artista, Mixing y archivo de lanzamientos.
- Landing de *A la gente buena le pasan cosas malas* y smart link en `/escuchar/`.
- Reserva en cinco pasos con disponibilidad real en `Europe/Madrid`.
- D1 con protección transaccional frente a reservas dobles.
- Correos interno y de recepción mediante Resend.
- Turnstile, limitación de frecuencia y validación completa en servidor.
- Panel privado con contraseña en servidor, cookie firmada y Cloudflare Access opcional para reservas, estados, notas, bloqueos, excepciones, horarios y CSV.
- Generadores locales de QR y tarjetas para redes.
- Analítica propia agregada, sin cookies ni datos personales.
- SEO técnico, datos estructurados, sitemap, cabeceras de seguridad y páginas legales.
- Build público aislado en `dist/`; tests, migraciones y código servidor no se publican como archivos estáticos.

## Inicio rápido local

Requisitos: Node.js 22 o posterior.

```powershell
npm ci
Copy-Item wrangler.example.jsonc wrangler.jsonc
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Abre `http://127.0.0.1:8788/`. En desarrollo, los bypasses de Turnstile y administración solo funcionan cuando `ENVIRONMENT=development`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Construye y abre Pages Functions + D1 local |
| `npm run build` | Optimiza, empaqueta, versiona assets, valida rutas y genera `dist/` |
| `npm run check` | Audita HTML, canónicas, recursos y enlaces internos |
| `npm run images` | Regenera variantes WebP responsive |
| `npm run typecheck` | Comprueba TypeScript estricto |
| `npm run lint` | Ejecuta tipos estrictos y auditoría estática del sitio |
| `npm test` | Ejecuta Vitest |
| `npm run verify` | Build, tipos y tests |
| `npm run db:migrate:local` | Aplica migraciones a D1 local |
| `npm run db:migrate:remote` | Aplica migraciones a D1 de producción |

## Fuente única de verdad

Edita [config/site.js](config/site.js) para cambiar:

- datos de contacto y redes;
- lanzamientos, enlaces y canciones;
- servicios, precios y FAQ;
- horario inicial, duración, buffer y meses visibles;
- smart links e integraciones futuras;
- eventos analíticos permitidos y placeholders legales.

Los horarios modificados desde el panel se guardan en D1 y prevalecen sobre los valores iniciales. Los secretos nunca deben añadirse a `config/site.js`.

## Estructura principal

```text
admin/                 panel privado estático
assets/                estilos, imágenes, fuentes JS y bundles
config/site.js         contenido y configuración central
functions/             Cloudflare Pages Functions
migrations/            esquema y datos iniciales de D1
mixing/reservar/       flujo público de reserva
escuchar/              smart links
herramientas/          QR y tarjetas
legal/                 privacidad, aviso legal y cookies
scripts/               build, imágenes y comprobaciones
tests/                 pruebas unitarias e integración
dist/                  salida pública generada, ignorada por Git
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Cloudflare, D1, Resend, Turnstile y Access](docs/CLOUDFLARE-SETUP.md)
- [Operaciones y edición de contenido](docs/OPERATIONS.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Pruebas](docs/TESTING.md)
- [Checklist de despliegue](docs/DEPLOYMENT-CHECKLIST.md)
- [Configuración manual pendiente](docs/MANUAL-PENDING.md)
- [Decisiones técnicas](docs/DECISIONS.md)
- [Registro de archivos](docs/CHANGELOG-FILES.md)

## Datos públicos actuales

- Artista: AfroPX — Instagram `@afrxpx`
- Correo artístico y de reservas: `contacto@afropxmusic.com`
- Mixing: Pedro — activo desde 2018
- Correo de audio, publicado solo dentro de Mixing: `itsafrxpx@gmail.com`
- Estudio: `@afrxstudios`
- Teléfono: `685 585 342`

No hay pagos activos. Stripe solo dispone de campos de estado y un adaptador futuro; no se muestra ningún cobro al público.
