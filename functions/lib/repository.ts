import SITE_CONFIG from "../../config/site.js";
import { buildMonthAvailability, getSlotKeys } from "./availability";
import { HttpError } from "./http";
import { createBookingId } from "./ids";
import {
  addMinutesToTime,
  compareLocalDateTime,
  formatInTimeZone,
  getMonthBounds,
  zonedDateTimeToUtc
} from "./time";
import type {
  AvailabilityException,
  AvailabilityRule,
  BookingBlock,
  BookingInput,
  BookingRecord,
  BookingSettings,
  ServiceSnapshot
} from "./types";

interface SettingRow {
  key: string;
  value: string;
}

interface RuleRow {
  day_of_week: number;
  enabled: number;
  start_time: string;
  last_start_time: string;
  provisional_last_start: number;
}

interface BlockRow {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
}

interface ExceptionRow {
  exception_date: string;
  enabled: number;
  start_time: string | null;
  last_start_time: string | null;
  reason: string;
}

interface SlotRow {
  slot_key: string;
}

const SETTING_DEFAULTS: BookingSettings = {
  timezone: SITE_CONFIG.booking.timezone,
  slotIntervalMinutes: SITE_CONFIG.booking.slotIntervalMinutes,
  defaultDurationMinutes: SITE_CONFIG.booking.defaultDurationMinutes,
  bufferMinutes: SITE_CONFIG.booking.bufferMinutes,
  maxMonthsAhead: SITE_CONFIG.booking.maxMonthsAhead
};

function integerSetting(
  rows: Map<string, string>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(rows.get(key));
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export async function loadSettings(db: D1Database): Promise<BookingSettings> {
  const result = await db
    .prepare("SELECT key, value FROM booking_settings")
    .all<SettingRow>();
  const rows = new Map((result.results || []).map((row) => [row.key, row.value]));

  return {
    timezone: rows.get("timezone") || SETTING_DEFAULTS.timezone,
    slotIntervalMinutes: integerSetting(
      rows,
      "slot_interval_minutes",
      SETTING_DEFAULTS.slotIntervalMinutes,
      15,
      240
    ),
    defaultDurationMinutes: integerSetting(
      rows,
      "default_duration_minutes",
      SETTING_DEFAULTS.defaultDurationMinutes,
      15,
      720
    ),
    bufferMinutes: integerSetting(
      rows,
      "buffer_minutes",
      SETTING_DEFAULTS.bufferMinutes,
      0,
      240
    ),
    maxMonthsAhead: integerSetting(
      rows,
      "max_months_ahead",
      SETTING_DEFAULTS.maxMonthsAhead,
      1,
      24
    )
  };
}

export async function loadRules(db: D1Database): Promise<AvailabilityRule[]> {
  const result = await db
    .prepare(
      `SELECT day_of_week, enabled, start_time, last_start_time,
        provisional_last_start
       FROM availability_rules
       ORDER BY day_of_week`
    )
    .all<RuleRow>();

  return (result.results || []).map((row) => ({
    dayOfWeek: row.day_of_week,
    enabled: row.enabled === 1,
    start: row.start_time,
    lastStart: row.last_start_time,
    provisionalLastStart: row.provisional_last_start === 1
  }));
}

export async function loadCalendarData(
  db: D1Database,
  month: string
): Promise<{
  blocks: BookingBlock[];
  exceptions: AvailabilityException[];
  occupiedSlotKeys: Set<string>;
}> {
  const { start, end } = getMonthBounds(month);
  const endExclusive = `${end}T23:59:59.999Z`;
  const [blockResult, exceptionResult, slotResult] = await db.batch([
    db
      .prepare(
        `SELECT id, block_date, start_time, end_time, reason
         FROM booking_blocks
         WHERE block_date BETWEEN ?1 AND ?2`
      )
      .bind(start, end),
    db
      .prepare(
        `SELECT exception_date, enabled, start_time, last_start_time, reason
         FROM availability_exceptions
         WHERE exception_date BETWEEN ?1 AND ?2`
      )
      .bind(start, end),
    db
      .prepare(
        `SELECT slot_key
         FROM booking_slots
         WHERE start_at_utc >= ?1 AND start_at_utc <= ?2`
      )
      .bind(`${start}T00:00:00.000Z`, endExclusive)
  ]);

  const blocks = ((blockResult.results || []) as unknown as BlockRow[]).map(
    (row) => ({
      id: row.id,
      date: row.block_date,
      start: row.start_time,
      end: row.end_time,
      reason: row.reason
    })
  );
  const exceptions = (
    (exceptionResult.results || []) as unknown as ExceptionRow[]
  ).map((row) => ({
    date: row.exception_date,
    enabled: row.enabled === 1,
    start: row.start_time,
    lastStart: row.last_start_time,
    reason: row.reason
  }));
  const occupiedSlotKeys = new Set(
    ((slotResult.results || []) as unknown as SlotRow[]).map(
      (row) => row.slot_key
    )
  );

  return { blocks, exceptions, occupiedSlotKeys };
}

export function resolveServiceDuration(
  service: ServiceSnapshot,
  settings: BookingSettings
): number {
  const configured = SITE_CONFIG.mixing.services.find(
    (candidate) => candidate.id === service.id
  );
  return configured?.provisionalDuration
    ? settings.defaultDurationMinutes
    : service.durationMinutes;
}

export async function getAvailability(
  db: D1Database,
  month: string,
  service: ServiceSnapshot,
  now = new Date()
) {
  const [settings, rules, calendar] = await Promise.all([
    loadSettings(db),
    loadRules(db),
    loadCalendarData(db, month)
  ]);
  const durationMinutes = resolveServiceDuration(service, settings);

  return {
    settings,
    rules,
    durationMinutes,
    days: buildMonthAvailability({
      month,
      durationMinutes,
      settings,
      rules,
      blocks: calendar.blocks,
      exceptions: calendar.exceptions,
      occupiedSlotKeys: calendar.occupiedSlotKeys,
      now
    })
  };
}

export async function assertSlotAvailable(
  db: D1Database,
  input: BookingInput,
  service: ServiceSnapshot,
  now = new Date()
): Promise<{
  settings: BookingSettings;
  durationMinutes: number;
  startAtUtc: Date;
  endAtUtc: Date;
  slotKeys: string[];
}> {
  const month = input.localDate.slice(0, 7);
  const availability = await getAvailability(db, month, service, now);
  const day = availability.days.find(
    (candidate) => candidate.date === input.localDate
  );

  if (!day?.slots.includes(input.localTime)) {
    throw new HttpError(
      409,
      "SLOT_UNAVAILABLE",
      "Esa hora ya no está disponible. Elige otra franja."
    );
  }

  const nowLocal = formatInTimeZone(now, availability.settings.timezone);
  if (
    compareLocalDateTime(
      input.localDate,
      input.localTime,
      nowLocal.date,
      nowLocal.time
    ) <= 0
  ) {
    throw new HttpError(
      409,
      "SLOT_UNAVAILABLE",
      "No se puede reservar una hora pasada."
    );
  }

  const startAtUtc = zonedDateTimeToUtc(
    input.localDate,
    input.localTime,
    availability.settings.timezone
  );
  const endAtUtc = new Date(
    startAtUtc.getTime() + availability.durationMinutes * 60_000
  );
  const slotKeys = getSlotKeys(
    startAtUtc,
    availability.durationMinutes,
    availability.settings.bufferMinutes,
    availability.settings.slotIntervalMinutes
  );

  return {
    settings: availability.settings,
    durationMinutes: availability.durationMinutes,
    startAtUtc,
    endAtUtc,
    slotKeys
  };
}

export async function findBookingByClientRequestId(
  db: D1Database,
  clientRequestId: string
): Promise<BookingRecord | null> {
  return db
    .prepare("SELECT * FROM bookings WHERE client_request_id = ?1 LIMIT 1")
    .bind(clientRequestId)
    .first<BookingRecord>();
}

export async function createBooking(
  db: D1Database,
  input: BookingInput,
  service: ServiceSnapshot,
  now = new Date()
): Promise<{ booking: BookingRecord; created: boolean }> {
  const existing = await findBookingByClientRequestId(
    db,
    input.clientRequestId
  );
  if (existing) {
    return { booking: existing, created: false };
  }

  const slot = await assertSlotAvailable(db, input, service, now);
  const bookingId = createBookingId(input.localDate);
  const createdAt = now.toISOString();
  const privacyAcceptedAt = createdAt;
  const priceLabel = service.priceLabel;

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO bookings (
          id, client_request_id, status, service_id, service_name,
          price_cents, price_label, currency, customer_name, customer_email,
          customer_phone, artist_name, song_count, files_url, project_notes,
          local_date, local_time, timezone, start_at_utc, end_at_utc,
          duration_minutes, privacy_accepted_at, marketing_consent,
          internal_email_status, customer_email_status, payment_status,
          created_at, updated_at
        ) VALUES (
          ?1, ?2, 'pending', ?3, ?4,
          ?5, ?6, ?7, ?8, ?9,
          ?10, ?11, ?12, ?13, ?14,
          ?15, ?16, ?17, ?18, ?19,
          ?20, ?21, ?22,
          'pending', 'pending', 'not_required',
          ?23, ?23
        )`
      )
      .bind(
        bookingId,
        input.clientRequestId,
        service.id,
        service.name,
        service.priceCents,
        priceLabel,
        service.currency,
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        input.artistName,
        input.songCount,
        input.filesUrl,
        input.projectNotes,
        input.localDate,
        input.localTime,
        slot.settings.timezone,
        slot.startAtUtc.toISOString(),
        slot.endAtUtc.toISOString(),
        slot.durationMinutes,
        privacyAcceptedAt,
        input.marketingConsent ? 1 : 0,
        createdAt
      )
  ];

  slot.slotKeys.forEach((slotKey, index) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO booking_slots
            (slot_key, booking_id, local_date, local_time, start_at_utc)
           VALUES (?1, ?2, ?3, ?4, ?5)`
        )
        .bind(
          slotKey,
          bookingId,
          input.localDate,
          addMinutesToTime(
            input.localTime,
            index * slot.settings.slotIntervalMinutes
          ),
          new Date(
            slot.startAtUtc.getTime() +
              index * slot.settings.slotIntervalMinutes * 60_000
          ).toISOString()
        )
    );
  });

  try {
    await db.batch(statements);
  } catch (error) {
    const racedExisting = await findBookingByClientRequestId(
      db,
      input.clientRequestId
    );
    if (racedExisting) {
      return { booking: racedExisting, created: false };
    }

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("booking_slots.slot_key") ||
      message.includes("UNIQUE constraint")
    ) {
      throw new HttpError(
        409,
        "SLOT_UNAVAILABLE",
        "Esa hora acaba de ser reservada. Elige otra franja."
      );
    }
    throw error;
  }

  const booking = await db
    .prepare("SELECT * FROM bookings WHERE id = ?1")
    .bind(bookingId)
    .first<BookingRecord>();
  if (!booking) {
    throw new Error("BOOKING_INSERT_NOT_VISIBLE");
  }

  return { booking, created: true };
}
