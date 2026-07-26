import { writeAudit } from "../../lib/audit";
import { requireDatabase } from "../../lib/env";
import {
  HttpError,
  json,
  methodNotAllowed,
  readJsonBody
} from "../../lib/http";
import { loadRules, loadSettings } from "../../lib/repository";
import { isTime } from "../../lib/time";
import type { AdminIdentity, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const [settings, availability] = await Promise.all([
    loadSettings(db),
    loadRules(db)
  ]);
  return json({ ok: true, settings, availability });
};

interface SettingsInput {
  slotIntervalMinutes?: unknown;
  defaultDurationMinutes?: unknown;
  bufferMinutes?: unknown;
  maxMonthsAhead?: unknown;
  availability?: unknown;
}

function integer(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new HttpError(
      422,
      "INVALID_SETTING",
      `${name} debe ser un número entre ${minimum} y ${maximum}.`
    );
  }
  return parsed;
}

export const onRequestPatch: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const current = await loadSettings(db);
  const body = await readJsonBody<SettingsInput>(context.request, 16_000);
  const settings = {
    slotIntervalMinutes:
      body.slotIntervalMinutes == null
        ? current.slotIntervalMinutes
        : integer(body.slotIntervalMinutes, "El intervalo", 15, 240),
    defaultDurationMinutes:
      body.defaultDurationMinutes == null
        ? current.defaultDurationMinutes
        : integer(body.defaultDurationMinutes, "La duración", 15, 720),
    bufferMinutes:
      body.bufferMinutes == null
        ? current.bufferMinutes
        : integer(body.bufferMinutes, "El margen", 0, 240),
    maxMonthsAhead:
      body.maxMonthsAhead == null
        ? current.maxMonthsAhead
        : integer(body.maxMonthsAhead, "El horizonte", 1, 24)
  };

  const statements: D1PreparedStatement[] = [
    ["slot_interval_minutes", settings.slotIntervalMinutes],
    ["default_duration_minutes", settings.defaultDurationMinutes],
    ["buffer_minutes", settings.bufferMinutes],
    ["max_months_ahead", settings.maxMonthsAhead]
  ].map(([key, value]) =>
    db
      .prepare(
        `INSERT INTO booking_settings (key, value)
         VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
      )
      .bind(key, String(value))
  );

  if (body.availability != null) {
    if (!Array.isArray(body.availability) || body.availability.length !== 7) {
      throw new HttpError(
        422,
        "INVALID_AVAILABILITY",
        "Debes indicar los siete días de la semana."
      );
    }

    for (const rawRule of body.availability) {
      const rule = rawRule as Record<string, unknown>;
      const day = Number(rule.dayOfWeek);
      const enabled = rule.enabled === true;
      const start = typeof rule.start === "string" ? rule.start : "";
      const lastStart =
        typeof rule.lastStart === "string" ? rule.lastStart : "";
      if (
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6 ||
        !isTime(start) ||
        !isTime(lastStart) ||
        start > lastStart
      ) {
        throw new HttpError(
          422,
          "INVALID_AVAILABILITY",
          "Uno de los horarios semanales no es válido."
        );
      }

      statements.push(
        db
          .prepare(
            `INSERT INTO availability_rules
              (day_of_week, enabled, start_time, last_start_time, provisional_last_start)
             VALUES (?1, ?2, ?3, ?4, 0)
             ON CONFLICT(day_of_week) DO UPDATE SET
               enabled = excluded.enabled,
               start_time = excluded.start_time,
               last_start_time = excluded.last_start_time,
               provisional_last_start = 0,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
          )
          .bind(day, enabled ? 1 : 0, start, lastStart)
      );
    }
  }

  await db.batch(statements);
  await writeAudit(
    db,
    context.data.admin.email,
    "settings.update",
    "booking_settings",
    "global",
    settings
  );

  return json({
    ok: true,
    settings: await loadSettings(db),
    availability: await loadRules(db)
  });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET", "PATCH"]);
