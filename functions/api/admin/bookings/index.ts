import { json, methodNotAllowed } from "../../../lib/http";
import { requireDatabase } from "../../../lib/env";
import type { AdminIdentity, BookingRecord, Env } from "../../../lib/types";

type AdminData = { admin: AdminIdentity };

interface CountRow {
  total: number;
}

const VALID_STATUSES = new Set([
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "completed"
]);

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  const db = requireDatabase(context.env);
  const url = new URL(context.request.url);
  const where: string[] = [];
  const values: unknown[] = [];

  const add = (clause: string, value: unknown) => {
    values.push(value);
    where.push(clause.replace("?", `?${values.length}`));
  };

  const status = url.searchParams.get("status") || "";
  if (VALID_STATUSES.has(status)) add("status = ?", status);

  const service = (url.searchParams.get("service") || "").slice(0, 80);
  if (service) add("service_id = ?", service);

  const from = url.searchParams.get("from") || "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(from)) add("local_date >= ?", from);

  const to = url.searchParams.get("to") || "";
  if (/^\d{4}-\d{2}-\d{2}$/u.test(to)) add("local_date <= ?", to);

  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (query) {
    const like = `%${query}%`;
    const baseIndex = values.length;
    values.push(like, like, like, like);
    where.push(
      `(id LIKE ?${baseIndex + 1} OR customer_name LIKE ?${baseIndex + 2}
        OR customer_email LIKE ?${baseIndex + 3}
        OR artist_name LIKE ?${baseIndex + 4})`
    );
  }

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(url.searchParams.get("pageSize")) || 30)
  );
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countStatement = db
    .prepare(`SELECT COUNT(*) AS total FROM bookings ${whereSql}`)
    .bind(...values);
  const listValues = [...values, pageSize, (page - 1) * pageSize];
  const listStatement = db
    .prepare(
      `SELECT *
       FROM bookings
       ${whereSql}
       ORDER BY local_date ASC, local_time ASC, created_at DESC
       LIMIT ?${values.length + 1} OFFSET ?${values.length + 2}`
    )
    .bind(...listValues);

  const [countResult, listResult] = await db.batch([
    countStatement,
    listStatement
  ]);
  const countRows = (countResult.results || []) as unknown as CountRow[];

  return json({
    ok: true,
    identity: { email: context.data.admin.email },
    page,
    pageSize,
    total: countRows[0]?.total || 0,
    bookings: (listResult.results || []) as unknown as BookingRecord[]
  });
};

export const onRequest: PagesFunction<Env, string, AdminData> = async () =>
  methodNotAllowed(["GET"]);
