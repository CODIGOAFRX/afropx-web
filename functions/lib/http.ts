import { getAllowedOrigins } from "./env";
import type { Env } from "./types";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(
  payload: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(payload), {
    ...init,
    headers
  });
}

export function apiError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { fields: error.details } : {})
        }
      },
      { status: error.status }
    );
  }

  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
    return json(
      {
        ok: false,
        error: {
          code: "SERVICE_NOT_CONFIGURED",
          message:
            "El sistema de reservas todavía no está conectado a su base de datos."
        }
      },
      { status: 503 }
    );
  }

  console.error("Unhandled API error", error);
  return json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "No se ha podido completar la operación."
      }
    },
    { status: 500 }
  );
}

export function assertSameOrigin(request: Request, env: Env): void {
  const origin = request.headers.get("origin");

  if (!origin || !getAllowedOrigins(env).has(origin)) {
    throw new HttpError(
      403,
      "ORIGIN_NOT_ALLOWED",
      "No se ha podido validar el origen de la solicitud."
    );
  }
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes = 24_000
): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "La solicitud debe enviarse como JSON."
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) {
    throw new HttpError(
      413,
      "PAYLOAD_TOO_LARGE",
      "La solicitud supera el tamaño permitido."
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new HttpError(
      413,
      "PAYLOAD_TOO_LARGE",
      "La solicitud supera el tamaño permitido."
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(
      400,
      "INVALID_JSON",
      "El contenido de la solicitud no es JSON válido."
    );
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function methodNotAllowed(allowed: string[]): Response {
  return json(
    {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Método no permitido."
      }
    },
    {
      status: 405,
      headers: {
        Allow: allowed.join(", ")
      }
    }
  );
}
