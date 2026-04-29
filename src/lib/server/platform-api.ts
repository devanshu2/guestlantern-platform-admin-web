import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env";
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieOptions,
  csrfCookieOptions,
  expiredCookieOptions
} from "@/lib/security/cookies";
import { createCsrfToken, verifyCsrf } from "@/lib/security/csrf";
import { mockPlatformApi } from "@/lib/server/mock-platform-api";
import { serverLogger } from "@/lib/server/logger";
import type { PlatformAdminAuthTokens } from "@/lib/api/types";

type PlatformFetchOptions = {
  method?: string;
  body?: BodyInit | null;
  contentType?: string | null;
  bearerToken?: string;
};

function appendSearch(path: string, search: string): string {
  return search ? `${path}${search}` : path;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseFromBackend(response: Response, body: unknown): NextResponse {
  return NextResponse.json(body, {
    status: response.status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

export async function platformFetch(
  request: Request,
  path: string,
  options: PlatformFetchOptions = {}
): Promise<Response> {
  const env = getServerEnv();
  const method = options.method ?? request.method;
  const startedAt = Date.now();

  if (env.PLATFORM_ADMIN_API_MOCK) {
    const response = await mockPlatformApi(request, path);
    serverLogger.debug("platform_api.mock_response", {
      method,
      path,
      status: response.status,
      duration_ms: Date.now() - startedAt
    });
    return response;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.PLATFORM_ADMIN_REQUEST_TIMEOUT_MS);

  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set("content-type", options.contentType ?? "application/json");
  }
  if (options.bearerToken) {
    headers.set("authorization", `Bearer ${options.bearerToken}`);
  }
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  try {
    const response = await fetch(new URL(path, env.PLATFORM_ADMIN_API_BASE_URL), {
      method,
      body: options.body,
      headers,
      signal: controller.signal,
      cache: "no-store"
    });
    serverLogger.debug("platform_api.response", {
      method,
      path,
      status: response.status,
      duration_ms: Date.now() - startedAt
    });
    return response;
  } catch (error) {
    serverLogger.error("platform_api.request_failed", {
      method,
      path,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown_error"
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function setAuthCookies(response: NextResponse, tokens: PlatformAdminAuthTokens) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    authCookieOptions(tokens.expires_in_secs)
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    authCookieOptions(tokens.refresh_expires_in_secs)
  );
  response.cookies.set(CSRF_COOKIE, createCsrfToken(), csrfCookieOptions());
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions());
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", expiredCookieOptions());
  response.cookies.set(CSRF_COOKIE, "", { ...expiredCookieOptions(), httpOnly: false });
}

async function refreshTokens(request: NextRequest): Promise<PlatformAdminAuthTokens | null> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const response = await platformFetch(request, "/platform/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) return null;
  return (await response.json()) as PlatformAdminAuthTokens;
}

export async function proxyPlatformRequest(
  request: NextRequest,
  platformPath: string
): Promise<NextResponse> {
  if (!verifyCsrf(request)) {
    serverLogger.warn("platform_api.csrf_rejected", {
      method: request.method,
      path: platformPath
    });
    return NextResponse.json(
      {
        error: {
          code: "csrf_failed",
          message: "Security check failed. Reload the page and try again."
        }
      },
      { status: 403 }
    );
  }

  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
  const contentType = request.headers.get("content-type");
  const requestPath = appendSearch(platformPath, request.nextUrl.search);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  let backendResponse = await platformFetch(request, requestPath, {
    method: request.method,
    body,
    contentType,
    bearerToken: accessToken
  });
  let refreshedTokens: PlatformAdminAuthTokens | null = null;

  if (backendResponse.status === 401) {
    refreshedTokens = await refreshTokens(request);
    if (refreshedTokens) {
      backendResponse = await platformFetch(request, requestPath, {
        method: request.method,
        body,
        contentType,
        bearerToken: refreshedTokens.access_token
      });
    }
  }

  const parsed = await parseJsonSafe(backendResponse);
  const response = responseFromBackend(backendResponse, parsed);

  if (refreshedTokens) setAuthCookies(response, refreshedTokens);
  if (backendResponse.status === 401) clearAuthCookies(response);

  return response;
}

export async function proxyHealthRequest(
  request: NextRequest,
  healthPath: string
): Promise<NextResponse> {
  const backendResponse = await platformFetch(
    request,
    appendSearch(healthPath, request.nextUrl.search),
    {
      method: "GET",
      contentType: null
    }
  );
  const parsed = await parseJsonSafe(backendResponse);
  return responseFromBackend(backendResponse, parsed);
}

export async function backendLogin(
  request: NextRequest,
  payload: { email: string; password: string }
): Promise<NextResponse> {
  const backendResponse = await platformFetch(request, "/platform/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const parsed = await parseJsonSafe(backendResponse);

  if (!backendResponse.ok) return responseFromBackend(backendResponse, parsed);

  const tokens = parsed as PlatformAdminAuthTokens;
  const response = NextResponse.json(
    {
      admin: tokens.admin,
      expires_in_secs: tokens.expires_in_secs,
      refresh_expires_in_secs: tokens.refresh_expires_in_secs
    },
    { status: 200 }
  );
  setAuthCookies(response, tokens);
  return response;
}

export async function backendLogout(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const backendResponse = accessToken
    ? await platformFetch(request, "/platform/auth/logout", {
        method: "POST",
        bearerToken: accessToken
      })
    : null;

  const parsed = backendResponse ? await parseJsonSafe(backendResponse) : { status: "logged_out" };
  const response = NextResponse.json(parsed, {
    status: backendResponse?.status ?? 200
  });
  clearAuthCookies(response);
  return response;
}
