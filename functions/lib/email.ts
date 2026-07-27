import { createOpaqueId } from "./ids";
import type { BookingRecord, Env } from "./types";

interface ResendResult {
  id?: string;
  name?: string;
  message?: string;
}

interface DeliveryResult {
  status: "sent" | "failed" | "disabled";
  providerId: string | null;
  errorCode: string | null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "No indicado";
  return String(value);
}

function emailFrame(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f2f1ec;color:#080808;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f1ec">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#080808;color:#f7f6f1;border-top:10px solid #ff2d23">
        <tr><td style="padding:28px 32px 10px;font-size:24px;font-weight:900;letter-spacing:-1px">AFRO<span style="color:#23c4cc">PX</span> / AUDIO</td></tr>
        <tr><td style="padding:10px 32px 36px">${body}</td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #333;font-size:12px;color:#aaa">afropxmusic.com · contacto@afropxmusic.com</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoTable(booking: BookingRecord): string {
  const rows = [
    ["Reserva", booking.id],
    ["Estado", booking.status === "pending" ? "Pendiente" : booking.status],
    ["Servicio", booking.service_name],
    ["Precio", booking.price_label],
    ["Fecha", booking.local_date],
    ["Hora", `${booking.local_time} · Europe/Madrid`],
    ["Cliente", booking.customer_name],
    ["Correo", booking.customer_email],
    ["Teléfono", booking.customer_phone],
    ["Nombre artístico", display(booking.artist_name)],
    ["Canciones / pistas", display(booking.song_count)]
  ];

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #333;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">${escapeHtml(
            label
          )}</td><td style="padding:10px 0;border-bottom:1px solid #333;text-align:right;font-weight:700">${escapeHtml(
            value
          )}</td></tr>`
      )
      .join("")}
  </table>`;
}

function internalEmail(booking: BookingRecord, env: Env) {
  const adminUrl = env.ADMIN_URL || "https://afropxmusic.com/admin/";
  const html = emailFrame(
    `Nueva solicitud ${booking.id}`,
    `<p style="margin:0;color:#ff2d23;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Nueva solicitud</p>
     <h1 style="margin:10px 0 0;font-size:34px;line-height:1">Hay un proyecto esperando.</h1>
     ${infoTable(booking)}
     <h2 style="font-size:16px">Información del proyecto</h2>
     <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(booking.project_notes)}</p>
     <p><strong>Archivos:</strong> ${
       booking.files_url
         ? `<a style="color:#23c4cc" href="${escapeHtml(
             booking.files_url
           )}">${escapeHtml(booking.files_url)}</a>`
         : "No indicados"
     }</p>
     <p><strong>Creada:</strong> ${escapeHtml(booking.created_at)}</p>
     <p style="margin-top:28px"><a href="${escapeHtml(
       adminUrl
     )}" style="display:inline-block;background:#ff2d23;color:#080808;padding:14px 20px;text-decoration:none;font-weight:900;text-transform:uppercase">Abrir panel de reservas</a></p>`
  );

  const text = [
    `NUEVA SOLICITUD · ${booking.id}`,
    `Estado: pendiente`,
    `Servicio: ${booking.service_name}`,
    `Precio: ${booking.price_label}`,
    `Fecha y hora: ${booking.local_date} ${booking.local_time} Europe/Madrid`,
    `Cliente: ${booking.customer_name}`,
    `Correo: ${booking.customer_email}`,
    `Teléfono: ${booking.customer_phone}`,
    `Nombre artístico: ${display(booking.artist_name)}`,
    `Canciones / pistas: ${display(booking.song_count)}`,
    `Proyecto: ${booking.project_notes}`,
    `Archivos: ${display(booking.files_url)}`,
    `Creada: ${booking.created_at}`,
    `Panel: ${adminUrl}`
  ].join("\n");

  return {
    subject: `Nueva solicitud ${booking.id} · ${booking.service_name}`,
    html,
    text
  };
}

function customerEmail(booking: BookingRecord) {
  const statusMessage =
    booking.status === "pending"
      ? "Tu solicitud ha llegado y está pendiente de confirmación. La fecha no queda cerrada hasta que Pedro la confirme contigo."
      : `Estado actual de tu solicitud: ${booking.status}.`;
  const html = emailFrame(
    `Solicitud recibida ${booking.id}`,
    `<p style="margin:0;color:#ff2d23;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Solicitud recibida</p>
     <h1 style="margin:10px 0 0;font-size:34px;line-height:1">Gracias, ${escapeHtml(
       booking.customer_name
     )}.</h1>
     <p style="font-size:17px;line-height:1.6">${escapeHtml(statusMessage)}</p>
     ${infoTable(booking)}
     <p style="line-height:1.6">Si necesitas modificar o cancelar la solicitud, responde a este correo indicando el identificador <strong>${escapeHtml(
       booking.id
     )}</strong> o escribe a <a href="mailto:contacto@afropxmusic.com" style="color:#23c4cc">contacto@afropxmusic.com</a>.</p>`
  );

  const text = [
    `SOLICITUD RECIBIDA · ${booking.id}`,
    statusMessage,
    `Servicio: ${booking.service_name}`,
    `Precio: ${booking.price_label}`,
    `Fecha y hora: ${booking.local_date} ${booking.local_time} Europe/Madrid`,
    `Contacto para cambios: contacto@afropxmusic.com`
  ].join("\n");

  return {
    subject: `Hemos recibido tu solicitud · ${booking.id}`,
    html,
    text
  };
}

async function sendResendEmail(
  env: Env,
  to: string,
  content: { subject: string; html: string; text: string },
  idempotencyKey: string
): Promise<DeliveryResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      status: "disabled",
      providerId: null,
      errorCode: "RESEND_NOT_CONFIGURED"
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [to],
        reply_to: "contacto@afropxmusic.com",
        subject: content.subject,
        html: content.html,
        text: content.text
      })
    });
    const result = (await response.json()) as ResendResult;

    if (!response.ok || !result.id) {
      return {
        status: "failed",
        providerId: null,
        errorCode: result.name || `RESEND_HTTP_${response.status}`
      };
    }

    return {
      status: "sent",
      providerId: result.id,
      errorCode: null
    };
  } catch {
    return {
      status: "failed",
      providerId: null,
      errorCode: "RESEND_NETWORK_ERROR"
    };
  }
}

async function saveDelivery(
  db: D1Database,
  bookingId: string,
  recipientType: "internal" | "customer",
  result: DeliveryResult
): Promise<void> {
  const column =
    recipientType === "internal"
      ? "internal_email_status"
      : "customer_email_status";
  const errorCode = result.errorCode?.slice(0, 100) || null;

  await db.batch([
    db
      .prepare(
        `UPDATE bookings
         SET ${column} = ?1,
             last_email_error = CASE WHEN ?1 = 'failed' THEN ?2 ELSE last_email_error END,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?3`
      )
      .bind(result.status, errorCode, bookingId),
    db
      .prepare(
        `INSERT INTO email_log
          (id, booking_id, recipient_type, provider_id, status, error_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        createOpaqueId("email"),
        bookingId,
        recipientType,
        result.providerId,
        result.status,
        errorCode
      )
  ]);
}

export async function sendBookingEmails(
  env: Env,
  booking: BookingRecord,
  attemptSuffix = "initial"
): Promise<{
  internal: DeliveryResult;
  customer: DeliveryResult;
}> {
  if (!env.DB) throw new Error("DATABASE_NOT_CONFIGURED");

  const internal = await sendResendEmail(
    env,
    env.BOOKING_NOTIFICATION_EMAIL || "contacto@afropxmusic.com",
    internalEmail(booking, env),
    `${booking.id}-internal-${attemptSuffix}`
  );
  await saveDelivery(env.DB, booking.id, "internal", internal);

  const customer = await sendResendEmail(
    env,
    booking.customer_email,
    customerEmail(booking),
    `${booking.id}-customer-${attemptSuffix}`
  );
  await saveDelivery(env.DB, booking.id, "customer", customer);

  return { internal, customer };
}
