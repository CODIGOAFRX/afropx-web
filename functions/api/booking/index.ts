import { assertSameOrigin, getClientIp, json, methodNotAllowed, readJsonBody } from "../../lib/http";
import { requireDatabase } from "../../lib/env";
import { enforceRateLimit } from "../../lib/rate-limit";
import { createBooking } from "../../lib/repository";
import { sendBookingEmails } from "../../lib/email";
import { verifyTurnstile } from "../../lib/turnstile";
import { serviceSnapshot, validateBookingInput } from "../../lib/validation";
import type { Env } from "../../lib/types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  assertSameOrigin(context.request, context.env);
  const db = requireDatabase(context.env);
  const clientIp = getClientIp(context.request);

  await enforceRateLimit(context.env, clientIp, "booking-create");
  const body = await readJsonBody<unknown>(context.request);
  const input = validateBookingInput(body);
  await verifyTurnstile(context.env, input.turnstileToken, clientIp);

  const service = serviceSnapshot(input.serviceId);
  const result = await createBooking(db, input, service);

  let deliveries:
    | Awaited<ReturnType<typeof sendBookingEmails>>
    | null = null;
  if (result.created) {
    deliveries = await sendBookingEmails(context.env, result.booking);
  }

  const booking = result.booking;
  return json(
    {
      ok: true,
      created: result.created,
      booking: {
        id: booking.id,
        status: booking.status,
        serviceName: booking.service_name,
        priceLabel: booking.price_label,
        date: booking.local_date,
        time: booking.local_time,
        timezone: booking.timezone,
        email: deliveries
          ? {
              customer: deliveries.customer.status,
              internal: deliveries.internal.status
            }
          : {
              customer: booking.customer_email_status,
              internal: booking.internal_email_status
            }
      }
    },
    { status: result.created ? 201 : 200 }
  );
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["POST"]);
