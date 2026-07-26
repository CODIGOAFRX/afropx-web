import SITE_CONFIG from "../../config/site.js";
import { assertSameOrigin, getClientIp, json, methodNotAllowed, readJsonBody, HttpError } from "../lib/http";
import { requireDatabase } from "../lib/env";
import { enforceRateLimit } from "../lib/rate-limit";
import type { Env } from "../lib/types";

interface EventInput {
  event?: unknown;
  path?: unknown;
  detail?: unknown;
}

function safeDimension(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value
        .normalize("NFKC")
        .replace(/[^a-zA-Z0-9/_:.,-]/gu, "")
        .slice(0, maxLength)
    : "";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  assertSameOrigin(context.request, context.env);
  const db = requireDatabase(context.env);
  await enforceRateLimit(
    context.env,
    getClientIp(context.request),
    "analytics",
    120,
    15
  );

  const body = await readJsonBody<EventInput>(context.request, 2_000);
  const event = safeDimension(body.event, 50);
  const path = safeDimension(body.path, 160) || "/";
  const detail = safeDimension(body.detail, 100);

  if (!SITE_CONFIG.analytics.allowedEvents.includes(event)) {
    throw new HttpError(
      422,
      "INVALID_EVENT",
      "El evento analítico no está permitido."
    );
  }

  const day = new Date().toISOString().slice(0, 10);
  await db
    .prepare(
      `INSERT INTO analytics_daily
        (day, event_name, path, detail, event_count)
       VALUES (?1, ?2, ?3, ?4, 1)
       ON CONFLICT(day, event_name, path, detail)
       DO UPDATE SET event_count = event_count + 1`
    )
    .bind(day, event, path, detail)
    .run();

  return json({ ok: true }, { status: 202 });
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["POST"]);
