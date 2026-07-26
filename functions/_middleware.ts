import { apiError } from "./lib/http";
import type { Env } from "./lib/types";

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, PATCH, DELETE, OPTIONS"
      }
    });
  }

  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Cache-Control", headers.get("Cache-Control") || "no-store");
    headers.set("Vary", "Accept-Encoding");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    return apiError(error);
  }
};
