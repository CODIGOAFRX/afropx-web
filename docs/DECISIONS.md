# Decisiones técnicas

## 1. Conservar una web multipágina sin framework

La base existente ya era rápida, expresiva y mantenible. Un framework completo habría aumentado JavaScript y riesgo visual sin aportar valor al contenido estático. Las funciones dinámicas se encapsulan en módulos ESM y Pages Functions.

## 2. Cloudflare Pages Functions + D1

El dominio ya usa Cloudflare Pages. D1 evita otro proveedor, permite SQL y ofrece una restricción única real para el problema crítico de doble reserva.

## 3. Slot UTC como bloqueo primario

Una consulta previa nunca basta contra carreras. Cada intervalo ocupado se inserta como `booking_slots.slot_key` único dentro del mismo batch que la reserva. UTC evita ambigüedad de horario de verano, mientras que la interfaz conserva fecha/hora civil y `Europe/Madrid`.

## 4. Solicitud pendiente, no reserva confirmada

El envío guarda y bloquea la franja, pero el estado inicial es `pending`. Pedro confirma después de revisar material y alcance. Rechazar o cancelar libera los slots.

## 5. Precios como snapshot

Servicios y precios actuales se centralizan en configuración, pero cada reserva guarda nombre, importe y etiqueta. Un cambio futuro no altera solicitudes históricas.

## 6. Resend después de persistir

La reserva es la fuente principal. Primero se guarda y después se envían correos; un fallo externo se registra y puede reintentarse sin perder datos.

## 7. Turnstile y rate limit propios

Turnstile filtra automatización. D1 añade límite por acción y huella IP con sal, sin guardar la IP en claro. Son capas complementarias.

## 8. Cloudflare Access más verificación en código

Access evita exponer la interfaz. La Function valida también firma, emisor, audiencia y allowlist para no depender únicamente de una regla de dashboard.

## 9. Analítica agregada de primera parte

Se priorizó conocer uso básico sin cookies, perfiles ni PII. Los eventos y dimensiones están en allowlist y solo producen contadores diarios.

## 10. Integraciones musicales manuales primero

Los enlaces oficiales son más fiables que APIs no configuradas. El adaptador permite evolucionar sin bloquear el lanzamiento ni exponer tokens.

## 11. Herramientas promocionales en cliente

QR, portadas y canvas se procesan localmente. Esto reduce coste, latencia y tratamiento de archivos personales.

## 12. Stripe preparado pero desactivado

No hay suficiente información de condiciones, reembolsos o precios cerrados. El esquema admite una fase futura sin presentar un cobro ficticio.

## 13. Directorio público `dist/`

Publicar la raíz habría podido exponer tests, migraciones, fuentes y dependencias. El build copia una lista blanca y falla si detecta elementos privados.

## 14. Placeholders legales visibles

No se inventaron identidad, NIF, domicilio ni conservación. La web queda técnicamente preparada, pero el checklist bloquea producción hasta completar y revisar esos datos.

## 15. CSP pragmática

La CSP bloquea terceros salvo Turnstile, pero mantiene `'unsafe-inline'` por JSON-LD y estilos actuales. Se documenta como deuda técnica en vez de aplicar una restricción que rompa la web.
