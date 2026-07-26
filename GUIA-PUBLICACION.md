# Guía de publicación

La web ya no es únicamente estática: usa Cloudflare Pages Functions, D1, Turnstile, Resend y Access. Por eso la publicación debe seguir la guía actualizada:

1. [Configurar Cloudflare y servicios](docs/CLOUDFLARE-SETUP.md).
2. Completar [configuración manual pendiente](docs/MANUAL-PENDING.md).
3. Ejecutar la [lista previa al despliegue](docs/DEPLOYMENT-CHECKLIST.md).

Resumen de Pages:

- Comando de build: `npm run build`
- Directorio de salida: `dist`
- Rama de producción: `main`
- Functions: directorio `functions/` detectado por Cloudflare Pages
- Base de datos: binding D1 llamado `DB`

No se debe enviar a `main` mientras falten los datos legales o las credenciales obligatorias, porque el repositorio está conectado a un despliegue automático.
