# Configuración de Cloudflare y servicios

## 1. Preparar el proyecto

```powershell
npm ci
Copy-Item wrangler.example.jsonc wrangler.jsonc
Copy-Item .dev.vars.example .dev.vars
npm run verify
```

`wrangler.jsonc`, `.dev.vars` y cualquier `.env` real están ignorados por Git.

## 2. Crear D1

Con sesión iniciada en Wrangler:

```powershell
npx wrangler login
npx wrangler d1 create afropx-bookings
```

Cloudflare devuelve un `database_id`. Sustituye el UUID de desarrollo en `wrangler.jsonc` por ese ID y conserva el binding exacto `DB`.

Aplica el esquema remoto una sola vez por entorno:

```powershell
npm run db:migrate:remote
```

Para local:

```powershell
npm run db:migrate:local
```

Las migraciones son acumulativas; no edites una migración ya aplicada en producción. Añade un archivo numerado nuevo.

## 3. Crear el proyecto Pages

En Cloudflare Dashboard:

1. Workers & Pages → Create → Pages → Connect to Git.
2. Selecciona el repositorio `afropx-web`.
3. Rama de producción: `main`.
4. Comando de build: `npm run build`.
5. Directorio de salida: `dist`.
6. Variable de build recomendada: `NODE_VERSION=22`.
7. Vincula D1 con nombre de variable `DB`.

Pages detecta `functions/` en el repositorio y compila las Pages Functions junto al sitio.

## 4. Variables y secretos

Configura valores separados para Production y Preview.

| Nombre | Tipo | Obligatorio | Ejemplo o finalidad |
| --- | --- | --- | --- |
| `ENVIRONMENT` | texto | sí | `production` |
| `ALLOWED_ORIGINS` | texto | sí | `https://afropxmusic.com,https://www.afropxmusic.com` |
| `TURNSTILE_SITE_KEY` | texto público | sí | clave del widget |
| `TURNSTILE_SECRET_KEY` | secreto | sí | secreto del widget |
| `TURNSTILE_BYPASS` | texto | sí | `false` |
| `RESEND_API_KEY` | secreto | sí para correo | clave restringida de Resend |
| `RESEND_FROM_EMAIL` | texto | sí | `AfroPX <reservas@afropxmusic.com>` |
| `BOOKING_NOTIFICATION_EMAIL` | texto | sí | `contacto@afropxmusic.com` |
| `RATE_LIMIT_SALT` | secreto | sí | cadena aleatoria larga |
| `CF_ACCESS_TEAM_DOMAIN` | texto | sí | `equipo.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | texto | sí | audiencia de la aplicación Access |
| `ADMIN_EMAILS` | texto | sí | correos autorizados separados por coma |
| `ADMIN_BYPASS` | texto | sí | `false` |
| `ADMIN_URL` | texto | sí | `https://afropxmusic.com/admin/` |

No copies claves de producción a `.dev.vars`. Los bypasses nunca deben estar activos cuando `ENVIRONMENT=production`.

## 5. Turnstile

1. Turnstile → Add site.
2. Añade `afropxmusic.com` y el hostname de preview que vayas a probar.
3. Usa un widget Managed.
4. Guarda site key y secret en Pages.
5. Confirma `TURNSTILE_BYPASS=false`.

El backend verifica token, acción y cliente antes de crear la reserva.

## 6. Resend

1. Añade y verifica `afropxmusic.com` en Resend.
2. Publica exactamente los registros DNS de SPF y DKIM indicados por Resend.
3. Espera a que el dominio figure como verificado.
4. Crea una API key exclusiva para esta web.
5. Guarda `RESEND_API_KEY` como secret.
6. Usa una dirección del dominio verificado en `RESEND_FROM_EMAIL`.

Prueba una reserva real y comprueba:

- aviso en `contacto@afropxmusic.com`;
- acuse al cliente;
- ausencia de spam;
- estado `sent` en el panel.

## 7. Proteger administración con Access

En Zero Trust:

1. Access → Applications → Add an application → Self-hosted.
2. Crea una aplicación para `afropxmusic.com/admin/*`.
3. Crea otra para `afropxmusic.com/api/admin/*`, o incluye ambos paths si la interfaz lo permite.
4. Añade una política Allow únicamente para los correos administradores.
5. Copia el Team domain a `CF_ACCESS_TEAM_DOMAIN`.
6. Copia el Application Audience (AUD) a `CF_ACCESS_AUD`.
7. Repite los correos autorizados en `ADMIN_EMAILS`.

La doble lista es intencionada: Access bloquea en el perímetro y la Function vuelve a verificar JWT y correo.

## 8. Dominio

Conecta `afropxmusic.com` al proyecto Pages y activa HTTPS. Verifica también el comportamiento de `www`; si se usa, redirígelo al dominio canónico o mantenlo en `ALLOWED_ORIGINS`.

## 9. Preview

Para previews, añade el hostname exacto a `ALLOWED_ORIGINS` y al widget Turnstile. No uses datos reales ni el correo de producción si el entorno es de prueba.

## 10. Despliegue y rollback

El push a `main` activa producción. Antes, completa [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md).

Rollback:

1. Cloudflare Pages → Deployments.
2. Abre la última versión estable.
3. Promote/Rollback según la interfaz disponible.
4. Si el error es de código, revierte el commit y vuelve a enviar.
5. No reviertas una migración destructivamente; crea una migración correctiva.
