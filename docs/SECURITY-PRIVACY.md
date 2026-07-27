# Seguridad y privacidad

## Controles implementados

- Validación de esquema y longitud en servidor.
- Content-Type y tamaño máximo de payload.
- Comprobación de `Origin` en mutaciones públicas y privadas.
- Turnstile antes de persistir.
- Rate limiting atómico en D1.
- IP transformada mediante SHA-256 con sal privada; no se guarda en claro.
- Identificador idempotente por envío.
- Clave primaria por slot contra carreras.
- Contraseña verificada solo en servidor, cookie firmada `HttpOnly`, límite de intentos en D1 y Cloudflare Access opcional como segunda capa.
- Auditoría de cambios administrativos.
- Respuestas de API y administración con `no-store`.
- CSP, HSTS, `nosniff`, denegación de framing y permisos del navegador restringidos.
- Secrets fuera del repositorio y del bundle cliente.
- Directorio `dist/` con lista blanca de activos públicos.

## Datos tratados

La reserva puede guardar nombre, correo, teléfono, nombre artístico, número de canciones, enlace a archivos, descripción, servicio, fecha/hora y consentimientos. Las notas privadas son visibles solo en administración.

La analítica guarda únicamente día, evento permitido, ruta, detalle saneado y contador. No se envían nombres, correos, teléfonos, IP, texto del proyecto ni identificadores de reserva.

No se usan cookies analíticas. El panel usa una cookie técnica `HttpOnly`, `SameSite=Strict` y con caducidad de 12 horas. `sessionStorage` solo transfiere temporalmente la configuración de un QR al generador de tarjetas. Turnstile y Cloudflare Access pueden usar almacenamiento técnico propio en sus contextos.

## Conservación

El plazo legal y operativo exacto sigue pendiente. Antes de producción hay que:

1. definir conservación de solicitudes no aceptadas;
2. definir conservación de trabajos contratados y facturación;
3. documentar borrado o anonimización;
4. establecer un procedimiento para ejercer derechos.

No programes borrado automático hasta confirmar obligaciones fiscales, contractuales y de reclamación aplicables.

## Correos y enlaces de archivos

- Los correos pueden incluir la descripción y el enlace aportado por el cliente.
- El enlace no se descarga automáticamente.
- Pedro debe comprobar dominio y remitente antes de abrir archivos.
- No se deben copiar enlaces privados a notas públicas o herramientas analíticas.

## Administración

- Protege tanto `/admin/*` como `/api/admin/*`.
- Guarda `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` como secretos cifrados de Cloudflare, nunca en Git.
- Usa una contraseña exclusiva y rota cualquier valor que se haya compartido por chat o texto.
- Si activas Cloudflare Access como segunda capa, usa una cuenta con MFA y mantén `ADMIN_EMAILS` mínimo.
- Rota API keys y `RATE_LIMIT_SALT` tras una exposición.
- Revisa `admin_audit` cuando haya cambios inesperados.
- `ADMIN_BYPASS` solo es válido con `ENVIRONMENT=development` y cabecera local explícita.

## CSP y limitaciones

La CSP permite `'unsafe-inline'` para estilos y scripts porque las páginas actuales contienen JSON-LD y algunos estilos dinámicos. No permite código de terceros salvo Turnstile. Una segunda fase puede mover JSON-LD/estilos inline o adoptar nonces para eliminar esa excepción.

Las cabeceras de `_headers` son defensa adicional; la autorización real del panel depende de Access y de la verificación en Functions.

## Pagos

No hay cobro ni datos de tarjeta. Los campos `payment_*` son placeholders de modelo. No actives Stripe sin webhook firmado, idempotencia, términos comerciales y revisión legal.

## Datos legales pendientes

Las páginas legales muestran marcadores visibles porque no se ha inventado:

- titular o razón social;
- NIF/CIF;
- domicilio legal;
- plazo de conservación;
- jurisdicción, solo cuando proceda.

La redacción es una base técnica y debe revisarse con asesoramiento adecuado antes de producción.

## Respuesta básica a incidentes

1. Pausa el formulario o desvincula temporalmente D1 si hay abuso grave.
2. Rota Resend, Turnstile, Access y sales afectadas.
3. Revisa despliegues, `admin_audit`, correo y métricas agregadas.
4. Conserva evidencia sin exponer datos adicionales.
5. Evalúa obligaciones de notificación con asesoramiento especializado.
