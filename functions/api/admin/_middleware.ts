import { authenticateAdmin } from "../../lib/admin-auth";
import { assertSameOrigin } from "../../lib/http";
import type { AdminIdentity, Env } from "../../lib/types";

type AdminData = { admin: AdminIdentity };

export const onRequest: PagesFunction<Env, string, AdminData> = async (
  context
) => {
  context.data.admin = await authenticateAdmin(context.request, context.env);
  if (!["GET", "HEAD"].includes(context.request.method)) {
    assertSameOrigin(context.request, context.env);
  }
  return context.next();
};
