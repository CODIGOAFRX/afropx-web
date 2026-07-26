import { writeAudit } from "../../../../lib/audit";
import { sendBookingEmails } from "../../../../lib/email";
import { requireDatabase } from "../../../../lib/env";
import { HttpError, json, methodNotAllowed } from "../../../../lib/http";
import type {
  AdminIdentity,
  BookingRecord,
  Env
} from "../../../../lib/types";

type AdminData = { admin: AdminIdentity };

export const onRequestPost: PagesFunction<Env, "id", AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const booking = await db
    .prepare("SELECT * FROM bookings WHERE id = ?1 LIMIT 1")
    .bind(context.params.id)
    .first<BookingRecord>();
  if (!booking) {
    throw new HttpError(
      404,
      "BOOKING_NOT_FOUND",
      "No se ha encontrado esa reserva."
    );
  }

  const delivery = await sendBookingEmails(
    context.env,
    booking,
    `manual-${Date.now()}`
  );
  await writeAudit(
    db,
    context.data.admin.email,
    "booking.email_resend",
    "booking",
    booking.id,
    {
      internal: delivery.internal.status,
      customer: delivery.customer.status
    }
  );

  return json({ ok: true, delivery });
};

export const onRequest: PagesFunction<Env, "id", AdminData> = async () =>
  methodNotAllowed(["POST"]);
