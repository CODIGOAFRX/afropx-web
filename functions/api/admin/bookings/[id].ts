import { writeAudit } from "../../../lib/audit";
import { requireDatabase } from "../../../lib/env";
import {
  HttpError,
  json,
  methodNotAllowed,
  readJsonBody
} from "../../../lib/http";
import {
  sanitizeAdminNote,
  validateStatus
} from "../../../lib/validation";
import type {
  AdminIdentity,
  BookingRecord,
  BookingStatus,
  Env
} from "../../../lib/types";

type AdminData = { admin: AdminIdentity };

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rejected: [],
  cancelled: [],
  completed: []
};

async function loadBooking(
  db: D1Database,
  id: string
): Promise<BookingRecord> {
  const booking = await db
    .prepare("SELECT * FROM bookings WHERE id = ?1 LIMIT 1")
    .bind(id)
    .first<BookingRecord>();
  if (!booking) {
    throw new HttpError(
      404,
      "BOOKING_NOT_FOUND",
      "No se ha encontrado esa reserva."
    );
  }
  return booking;
}

function routeId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestGet: PagesFunction<Env, "id", AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const booking = await loadBooking(db, routeId(context.params.id));
  const emails = await db
    .prepare(
      `SELECT id, recipient_type, provider_id, status, error_code, created_at
       FROM email_log
       WHERE booking_id = ?1
       ORDER BY created_at DESC`
    )
    .bind(booking.id)
    .all();

  return json({
    ok: true,
    booking,
    emails: emails.results || []
  });
};

interface UpdateInput {
  status?: unknown;
  privateNotes?: unknown;
}

export const onRequestPatch: PagesFunction<Env, "id", AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const current = await loadBooking(db, routeId(context.params.id));
  const body = await readJsonBody<UpdateInput>(context.request, 8_000);
  const nextStatus =
    body.status == null
      ? current.status
      : (validateStatus(body.status) as BookingStatus);
  const privateNotes =
    body.privateNotes == null
      ? current.private_notes
      : sanitizeAdminNote(body.privateNotes);

  if (
    nextStatus !== current.status &&
    !TRANSITIONS[current.status].includes(nextStatus)
  ) {
    throw new HttpError(
      409,
      "INVALID_STATUS_TRANSITION",
      `No se puede pasar de ${current.status} a ${nextStatus}.`
    );
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE bookings
         SET status = ?1,
             private_notes = ?2,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?3`
      )
      .bind(nextStatus, privateNotes, current.id)
  ];
  if (
    nextStatus !== current.status &&
    (nextStatus === "rejected" || nextStatus === "cancelled")
  ) {
    statements.push(
      db
        .prepare("DELETE FROM booking_slots WHERE booking_id = ?1")
        .bind(current.id)
    );
  }

  await db.batch(statements);
  await writeAudit(
    db,
    context.data.admin.email,
    "booking.update",
    "booking",
    current.id,
    {
      previousStatus: current.status,
      status: nextStatus,
      notesChanged: privateNotes !== current.private_notes
    }
  );

  return json({
    ok: true,
    booking: await loadBooking(db, current.id)
  });
};

export const onRequest: PagesFunction<Env, "id", AdminData> = async () =>
  methodNotAllowed(["GET", "PATCH"]);
