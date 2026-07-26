import SITE_CONFIG from "../../config/site.js";
import { isDevelopment } from "./env";
import { HttpError } from "./http";
import type { Env } from "./types";

interface RateRow {
  request_count: number;
}

async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function enforceRateLimit(
  env: Env,
  rawClientKey: string,
  action: string,
  maxRequests = SITE_CONFIG.booking.rateLimit.maxRequests,
  windowMinutes = SITE_CONFIG.booking.rateLimit.windowMinutes
): Promise<void> {
  if (!env.DB) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const salt = env.RATE_LIMIT_SALT;
  if (!salt && !isDevelopment(env)) {
    throw new HttpError(
      503,
      "RATE_LIMIT_NOT_CONFIGURED",
      "La protección del formulario todavía no está configurada."
    );
  }

  const effectiveSalt = salt || "local-development-only";
  const windowMs = windowMinutes * 60_000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const clientHash = await hashKey(`${effectiveSalt}:${rawClientKey}`);
  const key = `${action}:${windowStart}:${clientHash}`;

  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, request_count)
     VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       request_count = request_count + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     RETURNING request_count`
  )
    .bind(key, windowStart)
    .first<RateRow>();

  if ((row?.request_count || 1) > maxRequests) {
    throw new HttpError(
      429,
      "RATE_LIMITED",
      "Has enviado demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo."
    );
  }

  if (Math.random() < 0.02) {
    const oldest = windowStart - 24 * 60 * 60_000;
    await env.DB.prepare(
      "DELETE FROM rate_limits WHERE window_start < ?1"
    )
      .bind(oldest)
      .run();
  }
}
