import type { Env } from "./types";

export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === "development";
}

export function isTrue(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

export function hasDatabase(env: Env): env is Env & { DB: D1Database } {
  return Boolean(env.DB);
}

export function getAllowedOrigins(env: Env): Set<string> {
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    "https://afropxmusic.com",
    "https://www.afropxmusic.com"
  ];

  if (isDevelopment(env)) {
    defaults.push(
      "http://127.0.0.1:8788",
      "http://localhost:8788",
      "http://127.0.0.1:4173",
      "http://localhost:4173"
    );
  }

  return new Set([...defaults, ...configured]);
}

export function requireDatabase(env: Env): D1Database {
  if (!env.DB) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return env.DB;
}
