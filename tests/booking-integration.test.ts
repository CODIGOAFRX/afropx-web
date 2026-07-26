import { afterEach, describe, expect, it } from "vitest";
import { createBooking } from "../functions/lib/repository";
import { serviceSnapshot } from "../functions/lib/validation";
import type { BookingInput } from "../functions/lib/types";
import {
  createMigratedDatabase,
  type SqliteD1Database
} from "./helpers/d1-sqlite";

let database: SqliteD1Database | null = null;

afterEach(() => {
  database?.close();
  database = null;
});

const input: BookingInput = {
  clientRequestId: "12345678-1234-1234-1234-123456789abc",
  serviceId: "remote-mix-master",
  localDate: "2026-08-03",
  localTime: "17:00",
  customerName: "Cliente Uno",
  customerEmail: "uno@example.com",
  customerPhone: "+34 600 000 001",
  artistName: null,
  songCount: 1,
  filesUrl: null,
  projectNotes: "Proyecto de integración con material preparado.",
  privacyAccepted: true,
  marketingConsent: false,
  turnstileToken: "development-bypass"
};

describe("booking persistence", () => {
  it("creates a pending reservation and occupies its slot", async () => {
    database = createMigratedDatabase();
    const result = await createBooking(
      database as unknown as D1Database,
      input,
      serviceSnapshot(input.serviceId),
      new Date("2026-07-01T12:00:00.000Z")
    );

    expect(result.created).toBe(true);
    expect(result.booking).toMatchObject({
      status: "pending",
      local_date: "2026-08-03",
      local_time: "17:00",
      price_cents: 6000
    });
    const slotCount = database.sqlite
      .prepare("SELECT COUNT(*) AS total FROM booking_slots")
      .get() as { total: number };
    expect(slotCount.total).toBe(1);
  });

  it("returns the same reservation for an idempotent retry", async () => {
    database = createMigratedDatabase();
    const service = serviceSnapshot(input.serviceId);
    const first = await createBooking(
      database as unknown as D1Database,
      input,
      service,
      new Date("2026-07-01T12:00:00.000Z")
    );
    const retry = await createBooking(
      database as unknown as D1Database,
      input,
      service,
      new Date("2026-07-01T12:01:00.000Z")
    );

    expect(retry.created).toBe(false);
    expect(retry.booking.id).toBe(first.booking.id);
  });

  it("prevents a second client from reserving the occupied slot", async () => {
    database = createMigratedDatabase();
    const service = serviceSnapshot(input.serviceId);
    await createBooking(
      database as unknown as D1Database,
      input,
      service,
      new Date("2026-07-01T12:00:00.000Z")
    );

    await expect(
      createBooking(
        database as unknown as D1Database,
        {
          ...input,
          clientRequestId: "abcdef12-1234-1234-1234-123456789abc",
          customerEmail: "dos@example.com"
        },
        service,
        new Date("2026-07-01T12:00:01.000Z")
      )
    ).rejects.toMatchObject({
      status: 409,
      code: "SLOT_UNAVAILABLE"
    });

    const bookingCount = database.sqlite
      .prepare("SELECT COUNT(*) AS total FROM bookings")
      .get() as { total: number };
    expect(bookingCount.total).toBe(1);
  });

  it("rolls back booking creation when the database uniqueness guard races", () => {
    database = createMigratedDatabase();
    const db = database.sqlite;
    db.exec(`
      INSERT INTO bookings (
        id, client_request_id, service_id, service_name, price_label,
        customer_name, customer_email, customer_phone, project_notes,
        local_date, local_time, start_at_utc, end_at_utc, duration_minutes,
        privacy_accepted_at
      ) VALUES (
        'AFR-EXISTING', 'existing-request', 'mix', 'Mix', 'Consultar',
        'Existing', 'existing@example.com', '600000000', 'Existing project',
        '2026-08-03', '17:00', '2026-08-03T15:00:00.000Z',
        '2026-08-03T16:00:00.000Z', 60, '2026-07-01T12:00:00.000Z'
      );
      INSERT INTO booking_slots
        (slot_key, booking_id, local_date, local_time, start_at_utc)
      VALUES
        ('2026-08-03T15:00', 'AFR-EXISTING', '2026-08-03', '17:00',
         '2026-08-03T15:00:00.000Z');
    `);

    expect(() => {
      db.exec("BEGIN IMMEDIATE");
      try {
        db.exec(`
          INSERT INTO bookings (
            id, client_request_id, service_id, service_name, price_label,
            customer_name, customer_email, customer_phone, project_notes,
            local_date, local_time, start_at_utc, end_at_utc, duration_minutes,
            privacy_accepted_at
          ) VALUES (
            'AFR-RACING', 'racing-request', 'mix', 'Mix', 'Consultar',
            'Racing', 'racing@example.com', '600000001', 'Racing project',
            '2026-08-03', '17:00', '2026-08-03T15:00:00.000Z',
            '2026-08-03T16:00:00.000Z', 60, '2026-07-01T12:00:00.000Z'
          );
          INSERT INTO booking_slots
            (slot_key, booking_id, local_date, local_time, start_at_utc)
          VALUES
            ('2026-08-03T15:00', 'AFR-RACING', '2026-08-03', '17:00',
             '2026-08-03T15:00:00.000Z');
        `);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }).toThrow();

    const racing = db
      .prepare("SELECT id FROM bookings WHERE id = 'AFR-RACING'")
      .get();
    expect(racing).toBeUndefined();
  });
});
