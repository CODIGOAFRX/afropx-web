# Checklist previa al despliegue

## Bloqueantes

- [ ] Titular o razón social completado.
- [ ] NIF/CIF completado.
- [ ] Domicilio legal completado.
- [ ] Plazo de conservación definido.
- [ ] Jurisdicción revisada cuando proceda.
- [ ] Último inicio de lunes a viernes confirmado.
- [ ] Duración real por tipo de servicio confirmada.
- [ ] D1 de producción creado y binding `DB` conectado.
- [ ] Migración remota aplicada.
- [ ] Turnstile configurado para el dominio.
- [ ] `TURNSTILE_BYPASS=false`.
- [ ] Dominio remitente verificado en Resend.
- [ ] `RESEND_API_KEY` guardada como secret.
- [ ] Cloudflare Access protege `/admin/*`.
- [ ] Cloudflare Access protege `/api/admin/*`.
- [ ] `ADMIN_BYPASS=false`.
- [ ] `RATE_LIMIT_SALT` aleatoria configurada.
- [ ] `ALLOWED_ORIGINS` contiene solo hostnames reales.

## Contenido

- [ ] Correos y teléfono revisados.
- [ ] Pre-save probado.
- [ ] Enlace YouTube añadido cuando exista, o estado “Disponible pronto” confirmado.
- [ ] Portada y `og:image` revisadas.
- [ ] Precios comerciales confirmados.
- [ ] FAQ y condiciones revisadas.
- [ ] Sitemap y robots revisados.

## Calidad

- [ ] `npm ci`
- [ ] `npm run verify`
- [ ] `npm audit`
- [ ] `dist/` no contiene código privado.
- [ ] QA a 390, 768, 1280 y 1440 px.
- [ ] Navegación completa por teclado.
- [ ] Consola sin errores.
- [ ] 404 correcta.
- [ ] Reserva completa en preview.
- [ ] Carrera de doble reserva probada.
- [ ] Correos interno y cliente recibidos.
- [ ] Cancelar/rechazar libera la franja.
- [ ] Panel inaccesible sin Access.
- [ ] Exportación CSV revisada.
- [ ] QR descargado y escaneado.
- [ ] Tarjetas descargadas en los cuatro formatos.

## Publicación

- [ ] Build de Pages: `npm run build`.
- [ ] Output de Pages: `dist`.
- [ ] Node 22.
- [ ] Variables configuradas en Production y Preview por separado.
- [ ] Copia de seguridad/export de D1 antes de cambios de esquema sensibles.
- [ ] Plan de rollback identificado.
- [ ] Ventana de comprobación posterior al despliegue reservada.

No marques producción como lista mientras quede un bloqueante.
