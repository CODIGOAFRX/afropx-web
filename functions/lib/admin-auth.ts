import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload
} from "jose";
import { readAdminSession } from "./admin-session";
import { isDevelopment, isTrue } from "./env";
import { HttpError } from "./http";
import type { AdminIdentity, Env } from "./types";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function normalizeTeamDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//u, "")
    .replace(/\/+$/u, "");
}

function getKeySet(teamDomain: string) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  let keySet = keySets.get(url);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(url));
    keySets.set(url, keySet);
  }
  return keySet;
}

function claimEmail(payload: JWTPayload): string {
  const candidate =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.sub === "string" && payload.sub.includes("@")
        ? payload.sub
        : "";
  return candidate.toLowerCase();
}

export async function authenticateAdmin(
  request: Request,
  env: Env
): Promise<AdminIdentity> {
  const passwordSession = await readAdminSession(request, env);
  if (passwordSession) return passwordSession;

  if (
    isDevelopment(env) &&
    isTrue(env.ADMIN_BYPASS) &&
    request.headers.get("x-dev-admin") === "true"
  ) {
    return {
      email: "local-admin@afropxmusic.com",
      subject: "local-development"
    };
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN
    ? normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN)
    : "";
  const audience = env.CF_ACCESS_AUD || "";
  const allowedEmails = new Set(
    (env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  if (!teamDomain || !audience || allowedEmails.size === 0) {
    throw new HttpError(
      401,
      "ADMIN_AUTH_REQUIRED",
      "Introduce la contraseña para acceder al panel."
    );
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    throw new HttpError(
      401,
      "ADMIN_AUTH_REQUIRED",
      "Debes identificarte para acceder al panel."
    );
  }

  try {
    const { payload } = await jwtVerify(token, getKeySet(teamDomain), {
      audience,
      issuer: `https://${teamDomain}`
    });
    const email = claimEmail(payload);

    if (!email || !allowedEmails.has(email)) {
      throw new HttpError(
        403,
        "ADMIN_FORBIDDEN",
        "La cuenta identificada no tiene acceso al panel."
      );
    }

    return {
      email,
      subject: typeof payload.sub === "string" ? payload.sub : email
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      401,
      "ADMIN_AUTH_INVALID",
      "La sesión privada no es válida o ha caducado."
    );
  }
}
