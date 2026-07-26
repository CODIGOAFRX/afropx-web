import { requireDatabase } from "../../lib/env";
import { json, methodNotAllowed } from "../../lib/http";
import { formatInTimeZone } from "../../lib/time";
import type { AdminIdentity, BookingRecord, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

interface SummaryRow {
  status: string;
  total: number;
}

interface EventRow {
  event_name: string;
  total: number;
}

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const now = new Date();
  const localToday = formatInTimeZone(now, "Europe/Madrid").date;

  const [statusResult, upcomingResult, eventResult] = await db.batch([
    db.prepare(
      `SELECT status, COUNT(*) AS total
       FROM bookings
       GROUP BY status`
    ),
    db
      .prepare(
        `SELECT *
         FROM bookings
         WHERE local_date >= ?1
           AND status IN ('pending', 'confirmed')
         ORDER BY local_date ASC, local_time ASC
         LIMIT 8`
      )
      .bind(localToday),
    db.prepare(
      `SELECT event_name, SUM(event_count) AS total
       FROM analytics_daily
       WHERE day >= date('now', '-30 day')
       GROUP BY event_name`
    )
  ]);

  return json({
    ok: true,
    generatedAt: now.toISOString(),
    counts: Object.fromEntries(
      ((statusResult.results || []) as unknown as SummaryRow[]).map((row) => [
        row.status,
        row.total
      ])
    ),
    upcoming: (upcomingResult.results || []) as unknown as BookingRecord[],
    analytics30d: Object.fromEntries(
      ((eventResult.results || []) as unknown as EventRow[]).map((row) => [
        row.event_name,
        row.total
      ])
    )
  });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET"]);
