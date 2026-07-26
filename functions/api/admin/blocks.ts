import { writeAudit } from "../../lib/audit";
import { requireDatabase } from "../../lib/env";
import {
  HttpError,
  json,
  methodNotAllowed,
  readJsonBody
} from "../../lib/http";
import { createOpaqueId } from "../../lib/ids";
import { isIsoDate, isTime } from "../../lib/time";
import type { AdminIdentity, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

function cleanReason(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().slice(0, 300)
    : "";
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const url = new URL(context.request.url);
  const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `SELECT id, block_date, start_time, end_time, reason, created_by, created_at
       FROM booking_blocks
       WHERE block_date >= ?1
       ORDER BY block_date ASC, start_time ASC
       LIMIT 250`
    )
    .bind(from)
    .all();

  return json({ ok: true, blocks: result.results || [] });
};

interface BlockInput {
  date?: unknown;
  start?: unknown;
  end?: unknown;
  reason?: unknown;
}

export const onRequestPost: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const body = await readJsonBody<BlockInput>(context.request, 4_000);
  const date = typeof body.date === "string" ? body.date : "";
  const start = typeof body.start === "string" && body.start ? body.start : null;
  const end = typeof body.end === "string" && body.end ? body.end : null;
  const reason = cleanReason(body.reason);

  if (!isIsoDate(date)) {
    throw new HttpError(422, "INVALID_DATE", "La fecha no es válida.");
  }
  if (
    (start && (!isTime(start) || !end || !isTime(end) || start >= end)) ||
    (!start && end)
  ) {
    throw new HttpError(
      422,
      "INVALID_TIME_RANGE",
      "La franja bloqueada no es válida."
    );
  }

  const id = createOpaqueId("block");
  await db
    .prepare(
      `INSERT INTO booking_blocks
        (id, block_date, start_time, end_time, reason, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(id, date, start, end, reason, context.data.admin.email)
    .run();
  await writeAudit(
    db,
    context.data.admin.email,
    "block.create",
    "booking_block",
    id,
    { date, start, end }
  );

  return json({ ok: true, id }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const id = new URL(context.request.url).searchParams.get("id") || "";
  if (!/^block_[a-f0-9]{32}$/u.test(id)) {
    throw new HttpError(
      422,
      "INVALID_BLOCK",
      "El bloqueo indicado no es válido."
    );
  }

  const result = await db
    .prepare("DELETE FROM booking_blocks WHERE id = ?1")
    .bind(id)
    .run();
  if (!result.meta.changes) {
    throw new HttpError(
      404,
      "BLOCK_NOT_FOUND",
      "No se ha encontrado ese bloqueo."
    );
  }
  await writeAudit(
    db,
    context.data.admin.email,
    "block.delete",
    "booking_block",
    id
  );

  return json({ ok: true });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET", "POST", "DELETE"]);
