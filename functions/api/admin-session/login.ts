import {
  createAdminSessionCookie,
  verifyAdminPassword
} from "../../lib/admin-session";
import {
  assertSameOrigin,
  getClientIp,
  HttpError,
  json,
  methodNotAllowed,
  readJsonBody
} from "../../lib/http";
import { enforceRateLimit } from "../../lib/rate-limit";
import type { Env } from "../../lib/types";

interface LoginInput {
  password?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  assertSameOrigin(context.request, context.env);
  await enforceRateLimit(
    context.env,
    getClientIp(context.request),
    "admin_login",
    5,
    15
  );

  const input = await readJsonBody<LoginInput>(context.request, 1_024);
  const password = typeof input.password === "string" ? input.password : "";
  if (
    !password ||
    password.length > 256 ||
    !(await verifyAdminPassword(password, context.env))
  ) {
    throw new HttpError(
      403,
      "ADMIN_FORBIDDEN",
      "No tienes permiso para ver esto."
    );
  }

  return json(
    {
      ok: true,
      redirect: "/admin/"
    },
    {
      headers: {
        "Set-Cookie": await createAdminSessionCookie(
          context.request,
          context.env
        )
      }
    }
  );
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["POST"]);
