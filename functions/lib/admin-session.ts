import { jwtVerify, SignJWT } from "jose";
import { HttpError } from "./http";
import type { AdminIdentity, Env } from "./types";

const COOKIE_NAME = "afropx_admin_session";
const SESSION_ISSUER = "https://afropxmusic.com";
const SESSION_AUDIENCE = "afropx-admin";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function secretKey(env: Env): Uint8Array {
  return new TextEncoder().encode(env.ADMIN_SESSION_SECRET || "");
}

function cookieValue(request: Request, name: string): string {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return "";
}

function secureAttribute(request: Request): string {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

function adminEmail(env: Env): string {
  return (
    (env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .find(Boolean) || "contacto@afropxmusic.com"
  );
}

async function digest(value: string): Promise<Uint8Array> {
  const result = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return new Uint8Array(result);
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right)
  ]);
  let difference = left.length === right.length ? 0 : 1;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

export function adminPasswordConfigured(env: Env): boolean {
  return Boolean(
    env.ADMIN_PASSWORD &&
      env.ADMIN_PASSWORD.length >= 12 &&
      env.ADMIN_SESSION_SECRET &&
      env.ADMIN_SESSION_SECRET.length >= 32
  );
}

export function requireAdminPasswordConfiguration(env: Env): void {
  if (!adminPasswordConfigured(env)) {
    throw new HttpError(
      503,
      "ADMIN_AUTH_NOT_CONFIGURED",
      "El acceso privado todavía no está configurado en Cloudflare."
    );
  }
}

export async function verifyAdminPassword(
  candidate: string,
  env: Env
): Promise<boolean> {
  requireAdminPasswordConfiguration(env);
  return constantTimeEqual(candidate, env.ADMIN_PASSWORD || "");
}

export async function createAdminSessionCookie(
  request: Request,
  env: Env
): Promise<string> {
  requireAdminPasswordConfiguration(env);
  const email = adminEmail(env);
  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("password-session")
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey(env));

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureAttribute(request)}`;
}

export function clearAdminSessionCookie(request: Request): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute(request)}`;
}

export async function readAdminSession(
  request: Request,
  env: Env
): Promise<AdminIdentity | null> {
  if (!adminPasswordConfigured(env)) return null;
  const token = cookieValue(request, COOKIE_NAME);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(env), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE
    });
    if (payload.role !== "admin" || typeof payload.email !== "string") {
      return null;
    }
    return {
      email: payload.email.toLowerCase(),
      subject:
        typeof payload.sub === "string" ? payload.sub : "password-session"
    };
  } catch {
    return null;
  }
}
