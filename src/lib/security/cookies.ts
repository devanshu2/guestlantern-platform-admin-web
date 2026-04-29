import { getServerEnv } from "@/lib/config/env";
export {
  ACCESS_TOKEN_COOKIE,
  CSRF_COOKIE,
  REFRESH_TOKEN_COOKIE
} from "@/lib/security/cookie-names";

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict";
  path?: string;
  maxAge?: number;
  domain?: string;
};

export function authCookieOptions(maxAge: number): CookieOptions {
  const env = getServerEnv();
  return {
    httpOnly: true,
    secure: env.PLATFORM_ADMIN_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge,
    domain: env.PLATFORM_ADMIN_COOKIE_DOMAIN
  };
}

export function csrfCookieOptions(): CookieOptions {
  const env = getServerEnv();
  return {
    httpOnly: false,
    secure: env.PLATFORM_ADMIN_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
    domain: env.PLATFORM_ADMIN_COOKIE_DOMAIN
  };
}

export function expiredCookieOptions(): CookieOptions {
  const env = getServerEnv();
  return {
    httpOnly: true,
    secure: env.PLATFORM_ADMIN_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    domain: env.PLATFORM_ADMIN_COOKIE_DOMAIN
  };
}
