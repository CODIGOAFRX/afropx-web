import { writeAudit } from "../../lib/audit";
import { requireDatabase } from "../../lib/env";
import {
  HttpError,
  json,
  methodNotAllowed,
  readJsonBody
} from "../../lib/http";
import { isIsoDate, isTime } from "../../lib/time";
import type { AdminIdentity, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

interface ExceptionInput {
  date?: unknown;
  enabled?: unknown;
  start?: unknown;
  lastStart?: unknown;
  reason?: unknown;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const result = await db
    .prepare(
      `SELECT exception_date, enabled, start_time, last_start_time,
        reason, created_by, updated_at
       FROM availability_exceptions
       WHERE exception_date >= date('now')
       ORDER BY exception_date ASC
       LIMIT 250`
    )
    .all();
  return json({ ok: true, exceptions: result.results || [] });
};

export const onRequestPost: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const body = await readJsonBody<ExceptionInput>(context.request, 4_000);
  const date = typeof body.date === "string" ? body.date : "";
  const enabled = body.enabled === true;
  const start = typeof body.start === "string" ? body.start : "";
  const lastStart =
    typeof body.lastStart === "string" ? body.lastStart : "";
  const reason =
    typeof body.reason === "string"
      ? body.reason.normalize("NFKC").trim().slice(0, 300)
      : "";

  if (!isIsoDate(date)) {
    throw new HttpError(422, "INVALID_DATE", "La fecha no es válida.");
  }
  if (
    enabled &&
    (!isTime(start) || !isTime(lastStart) || start > lastStart)
  ) {
    throw new HttpError(
      422,
      "INVALID_TIME_RANGE",
      "El horario excepcional no es válido."
    );
  }

  await db
    .prepare(
      `INSERT INTO availability_exceptions
        (exception_date, enabled, start_time, last_start_time, reason, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(exception_date) DO UPDATE SET
         enabled = excluded.enabled,
         start_time = excluded.start_time,
         last_start_time = excluded.last_start_time,
         reason = excluded.reason,
         created_by = excluded.created_by,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
    .bind(
      date,
      enabled ? 1 : 0,
      enabled ? start : null,
      enabled ? lastStart : null,
      reason,
      context.data.admin.email
    )
    .run();
  await writeAudit(
    db,
    context.data.admin.email,
    "exception.upsert",
    "availability_exception",
    date,
    { enabled, start, lastStart }
  );

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const date = new URL(context.request.url).searchParams.get("date") || "";
  if (!isIsoDate(date)) {
    throw new HttpError(422, "INVALID_DATE", "La fecha no es válida.");
  }
  await db
    .prepare("DELETE FROM availability_exceptions WHERE exception_date = ?1")
    .bind(date)
    .run();
  await writeAudit(
    db,
    context.data.admin.email,
    "exception.delete",
    "availability_exception",
    date
  );
  return json({ ok: true });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET", "POST", "DELETE"]);
