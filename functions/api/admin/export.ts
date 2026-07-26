import { requireDatabase } from "../../lib/env";
import { methodNotAllowed } from "../../lib/http";
import type { AdminIdentity, BookingRecord, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

function safeCsvValue(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const result = await db
    .prepare(
      `SELECT *
       FROM bookings
       ORDER BY local_date DESC, local_time DESC
       LIMIT 10000`
    )
    .all<BookingRecord>();
  const rows = result.results || [];
  const columns: Array<[string, keyof BookingRecord]> = [
    ["ID", "id"],
    ["Estado", "status"],
    ["Servicio", "service_name"],
    ["Precio", "price_label"],
    ["Fecha", "local_date"],
    ["Hora", "local_time"],
    ["Nombre", "customer_name"],
    ["Correo", "customer_email"],
    ["Teléfono", "customer_phone"],
    ["Nombre artístico", "artist_name"],
    ["Canciones", "song_count"],
    ["Archivos", "files_url"],
    ["Proyecto", "project_notes"],
    ["Notas privadas", "private_notes"],
    ["Consentimiento promocional", "marketing_consent"],
    ["Correo interno", "internal_email_status"],
    ["Correo cliente", "customer_email_status"],
    ["Pago", "payment_status"],
    ["Creada", "created_at"],
    ["Actualizada", "updated_at"]
  ];
  const csv = [
    columns.map(([label]) => safeCsvValue(label)).join(","),
    ...rows.map((row) =>
      columns.map(([, key]) => safeCsvValue(row[key])).join(",")
    )
  ].join("\r\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="reservas-afropx-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET"]);
