import { authenticateAdmin } from "../lib/admin-auth";
import type { Env } from "../lib/types";

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  if (
    url.pathname === "/admin/login" ||
    url.pathname.startsWith("/admin/login/")
  ) {
    return context.next();
  }

  try {
    await authenticateAdmin(context.request, context.env);
    return context.next();
  } catch {
    const loginUrl = new URL("/admin/login/", url);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return Response.redirect(loginUrl, 302);
  }
};
