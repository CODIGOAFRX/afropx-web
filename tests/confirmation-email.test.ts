import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPatch } from "../functions/api/admin/bookings/[id]";
import { createBooking } from "../functions/lib/repository";
import type { BookingInput, Env } from "../functions/lib/types";
import { serviceSnapshot } from "../functions/lib/validation";
import {
  createMigratedDatabase,
  type SqliteD1Database
} from "./helpers/d1-sqlite";

let database: SqliteD1Database | null = null;

afterEach(() => {
  vi.unstubAllGlobals();
  database?.close();
  database = null;
});

const input: BookingInput = {
  clientRequestId: "confirm12-1234-1234-1234-123456789abc",
  serviceId: "remote-mix-master",
  localDate: "2026-08-03",
  localTime: "17:00",
  customerName: "Cliente Confirmación",
  customerEmail: "cliente@example.com",
  customerPhone: "+34 600 000 001",
  artistName: "Proyecto Uno",
  songCount: 1,
  filesUrl: null,
  projectNotes: "Proyecto preparado para confirmar.",
  privacyAccepted: true,
  marketingConsent: false,
  turnstileToken: "development-bypass"
};

async function confirmBooking(env: Env, bookingId: string) {
  return onRequestPatch({
    env,
    params: { id: bookingId },
    data: {
      admin: {
        email: "contacto@afropxmusic.com",
        subject: "test-admin"
      }
    },
    request: new Request(
      `https://afropxmusic.com/api/admin/bookings/${bookingId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" })
      }
    )
  } as never);
}

describe("confirmation email", () => {
  it("sends the customer a confirmation when the admin accepts", async () => {
    database = createMigratedDatabase();
    const db = database as unknown as D1Database;
    const created = await createBooking(
      db,
      input,
      serviceSnapshot(input.serviceId),
      new Date("2026-07-29T18:00:00.000Z")
    );
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: "email-confirmed-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await confirmBooking(
      {
        DB: db,
        RESEND_API_KEY: "re_test_confirmation",
        RESEND_FROM_EMAIL: "AfroPX <reservas@afropxmusic.com>"
      },
      created.booking.id
    );
    const payload = (await response.json()) as {
      booking: { status: string; customer_email_status: string };
      delivery: { status: string; providerId: string };
    };

    expect(response.status).toBe(200);
    expect(payload.booking.status).toBe("confirmed");
    expect(payload.booking.customer_email_status).toBe("sent");
    expect(payload.delivery).toMatchObject({
      status: "sent",
      providerId: "email-confirmed-123"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const email = JSON.parse(String(requestInit.body)) as {
      to: string[];
      subject: string;
      html: string;
    };
    expect(email.to).toEqual(["cliente@example.com"]);
    expect(email.subject).toContain("Reserva confirmada");
    expect(email.html).toContain("Tu sesión está confirmada");

    const log = database.sqlite
      .prepare(
        "SELECT recipient_type, status FROM email_log ORDER BY created_at DESC LIMIT 1"
      )
      .get() as { recipient_type: string; status: string };
    expect(log).toEqual({ recipient_type: "customer", status: "sent" });
  });

  it("confirms the booking but reports disabled when Resend is missing", async () => {
    database = createMigratedDatabase();
    const db = database as unknown as D1Database;
    const created = await createBooking(
      db,
      {
        ...input,
        clientRequestId: "confirm34-1234-1234-1234-123456789abc"
      },
      serviceSnapshot(input.serviceId),
      new Date("2026-07-29T18:00:00.000Z")
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await confirmBooking({ DB: db }, created.booking.id);
    const payload = (await response.json()) as {
      booking: { status: string };
      delivery: { status: string; errorCode: string };
    };

    expect(payload.booking.status).toBe("confirmed");
    expect(payload.delivery).toMatchObject({
      status: "disabled",
      errorCode: "RESEND_NOT_CONFIGURED"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
