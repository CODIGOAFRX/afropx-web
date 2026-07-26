# Configuración manual pendiente

## Datos que Pedro debe proporcionar

1. Nombre completo o razón social del titular.
2. NIF/CIF.
3. Domicilio o dirección válida a efectos legales.
4. Plazo de conservación de:
   - solicitudes rechazadas o abandonadas;
   - reservas y trabajos aceptados;
   - documentación contractual o fiscal.
5. Jurisdicción/localidad, solo si legalmente procede.
6. Último inicio real de lunes a viernes. Se usa provisionalmente `21:00`.
7. Duración real de cada servicio. Se usan provisionalmente 60 minutos.
8. Buffer deseado entre sesiones. Actualmente `0`.
9. Correos exactos autorizados para administración.

## Cloudflare

- Crear D1 `afropx-bookings`.
- Copiar su `database_id`.
- Añadir binding `DB`.
- Aplicar `0001_initial.sql`.
- Configurar Pages con build `npm run build` y output `dist`.
- Añadir dominio y comprobar `www`.
- Crear Turnstile y guardar ambas claves.
- Crear Access para panel y API privada.
- Generar `RATE_LIMIT_SALT`.

## Resend

- Verificar `afropxmusic.com`.
- Publicar SPF/DKIM.
- Crear API key restringida.
- Confirmar remitente `reservas@afropxmusic.com` o sustituirlo.
- Realizar una reserva controlada y revisar entrega.

## Contenido

- Añadir enlace YouTube del álbum cuando exista.
- Añadir URL de Spotify/Apple Music del álbum cuando se publique.
- Confirmar si se habilitarán TikTok y Apple Music en smart links.
- Revisar textos comerciales y revisiones incluidas.

## Opcional, segunda fase

- Adaptadores automáticos de Spotify/YouTube.
- Pagos Stripe.
- Confirmaciones y recordatorios automáticos por estado.
- Export/borrado asistido por política de conservación.
- CSP con nonces y eliminación de `'unsafe-inline'`.

## Estado de despliegue

El código puede probarse localmente y en un preview controlado. **No se debe hacer push a `main` ni promover producción** hasta cerrar los bloques legales y de credenciales anteriores, ya que GitHub activa el despliegue de Cloudflare Pages.
