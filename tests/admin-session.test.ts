import { describe, expect, it } from "vitest";
import {
  createAdminSessionCookie,
  readAdminSession,
  verifyAdminPassword
} from "../functions/lib/admin-session";
import type { Env } from "../functions/lib/types";

const env: Env = {
  ADMIN_PASSWORD: "a-development-password",
  ADMIN_SESSION_SECRET: "a-development-session-secret-that-is-long-enough",
  ADMIN_EMAILS: "contacto@afropxmusic.com"
};

describe("admin password session", () => {
  it("compares the configured password without exposing it to the client", async () => {
    await expect(
      verifyAdminPassword("a-development-password", env)
    ).resolves.toBe(true);
    await expect(verifyAdminPassword("wrong-password", env)).resolves.toBe(
      false
    );
  });

  it("creates and validates a signed HttpOnly cookie", async () => {
    const request = new Request("https://afropxmusic.com/admin/");
    const setCookie = await createAdminSessionCookie(request, env);
    const cookie = setCookie.split(";")[0];
    const authenticatedRequest = new Request(
      "https://afropxmusic.com/api/admin/summary",
      { headers: { Cookie: cookie } }
    );

    await expect(readAdminSession(authenticatedRequest, env)).resolves.toEqual({
      email: "contacto@afropxmusic.com",
      subject: "password-session"
    });
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Secure");
  });

  it("rejects a tampered cookie", async () => {
    const request = new Request("https://afropxmusic.com/admin/");
    const setCookie = await createAdminSessionCookie(request, env);
    const cookie = `${setCookie.split(";")[0]}tampered`;
    const tamperedRequest = new Request(
      "https://afropxmusic.com/api/admin/summary",
      { headers: { Cookie: cookie } }
    );

    await expect(readAdminSession(tamperedRequest, env)).resolves.toBeNull();
  });
});
