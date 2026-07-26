import { isDevelopment, isTrue } from "./env";
import { HttpError } from "./http";
import type { Env } from "./types";

interface TurnstileResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  env: Env,
  token: string,
  clientIp: string
): Promise<void> {
  if (
    isDevelopment(env) &&
    isTrue(env.TURNSTILE_BYPASS)
  ) {
    return;
  }

  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
    throw new HttpError(
      503,
      "TURNSTILE_NOT_CONFIGURED",
      "La protección anti-spam todavía no está configurada."
    );
  }

  if (!token) {
    throw new HttpError(
      422,
      "TURNSTILE_REQUIRED",
      "Completa la comprobación anti-spam."
    );
  }

  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  body.set("remoteip", clientIp);
  body.set("idempotency_key", crypto.randomUUID());

  let result: TurnstileResponse;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body
      }
    );
    result = (await response.json()) as TurnstileResponse;
  } catch {
    throw new HttpError(
      503,
      "TURNSTILE_UNAVAILABLE",
      "No se ha podido validar la comprobación anti-spam. Inténtalo de nuevo."
    );
  }

  if (!result.success || (result.action && result.action !== "booking")) {
    throw new HttpError(
      422,
      "TURNSTILE_FAILED",
      "La comprobación anti-spam ha caducado o no es válida."
    );
  }
}
