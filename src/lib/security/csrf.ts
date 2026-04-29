import { NextRequest } from "next/server";
import { CSRF_COOKIE } from "@/lib/security/cookie-names";

export const CSRF_HEADER = "x-csrf-token";

export function createCsrfToken(): string {
  return crypto.randomUUID();
}

export function isMutation(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export function verifyCsrf(request: NextRequest): boolean {
  if (!isMutation(request.method)) return true;

  const headerValue = request.headers.get(CSRF_HEADER);
  const cookieValue = request.cookies.get(CSRF_COOKIE)?.value;

  return Boolean(headerValue && cookieValue && headerValue === cookieValue);
}
