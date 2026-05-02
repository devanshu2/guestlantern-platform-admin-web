"use client";

import { ApiError, isErrorBody, normalizeError } from "@/lib/api/errors";
import { CSRF_COOKIE } from "@/lib/security/cookie-names";
import { CSRF_HEADER } from "@/lib/security/csrf";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  signal?: AbortSignal;
};

function csrfToken(): string | null {
  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isCsrfFailure(status: number, body: unknown): boolean {
  return status === 403 && isErrorBody(body) && body.error.code === "csrf_failed";
}

async function refreshSessionForCsrf(): Promise<boolean> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store"
  });
  await parseBody(response);
  return response.ok;
}

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {},
  retryOnCsrfFailure = true
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers.set(CSRF_HEADER, token);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store"
  });
  const parsed = await parseBody(response);

  if (!response.ok) {
    if (retryOnCsrfFailure && method !== "GET" && isCsrfFailure(response.status, parsed)) {
      const refreshed = await refreshSessionForCsrf();
      if (refreshed) return apiRequest<T>(url, options, false);
    }
    throw normalizeError(response.status, parsed);
  }

  return parsed as T;
}

export async function platformApi<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(`/api/platform${path}`, options);
}

export async function healthApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(`/api/health${path}`, { signal });
}

export async function login(email: string, password: string) {
  return apiRequest<{ admin: unknown }>("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export async function logout() {
  return apiRequest("/api/auth/logout", { method: "POST" });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
