import { clearAdminSessionCookie } from "../../lib/admin-session";
import { assertSameOrigin, json, methodNotAllowed } from "../../lib/http";
import type { Env } from "../../lib/types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  assertSameOrigin(context.request, context.env);
  return json(
    { ok: true, redirect: "/admin/login/" },
    {
      headers: {
        "Set-Cookie": clearAdminSessionCookie(context.request)
      }
    }
  );
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["POST"]);
