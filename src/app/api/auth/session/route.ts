import { NextRequest } from "next/server";
import { proxyPlatformRequest } from "@/lib/server/platform-api";
import { CSRF_COOKIE, csrfCookieOptions } from "@/lib/security/cookies";
import { createCsrfToken } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const response = await proxyPlatformRequest(request, "/platform/bootstrap");

  if (response.ok && !request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, createCsrfToken(), csrfCookieOptions());
  }

  return response;
}
