import { z } from "zod";

const booleanStringSchema = z
  .enum(["0", "1", "false", "true"])
  .optional()
  .transform((value) => (value == null ? undefined : value === "1" || value === "true"));

const envSchema = z.object({
  PLATFORM_ADMIN_ENVIRONMENT: z
    .enum(["development", "production", "mocked"])
    .default(process.env.NODE_ENV === "production" ? "production" : "development"),
  PLATFORM_ADMIN_LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
  PLATFORM_ADMIN_WEB_HOSTNAME: z.string().min(1).default("127.0.0.1"),
  PLATFORM_ADMIN_WEB_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  PLATFORM_ADMIN_API_BASE_URL: z.string().url().default("http://127.0.0.1:8080"),
  PLATFORM_ADMIN_API_MODE: z.enum(["real", "mock"]).optional(),
  PLATFORM_ADMIN_API_MOCK: booleanStringSchema,
  PLATFORM_ADMIN_COOKIE_SECURE: booleanStringSchema,
  PLATFORM_ADMIN_COOKIE_DOMAIN: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional()
  ),
  PLATFORM_ADMIN_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  PLATFORM_ADMIN_DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(25)
});

type ParsedServerEnv = z.infer<typeof envSchema>;

export type ServerEnv = Omit<
  ParsedServerEnv,
  "PLATFORM_ADMIN_API_MOCK" | "PLATFORM_ADMIN_COOKIE_SECURE" | "PLATFORM_ADMIN_LOG_LEVEL"
> & {
  PLATFORM_ADMIN_API_MOCK: boolean;
  PLATFORM_ADMIN_COOKIE_SECURE: boolean;
  PLATFORM_ADMIN_LOG_LEVEL: "debug" | "info" | "warn" | "error" | "silent";
};

let cachedEnv: ServerEnv | null = null;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = envSchema.parse({
    PLATFORM_ADMIN_ENVIRONMENT:
      source.PLATFORM_ADMIN_ENVIRONMENT ??
      (source.NODE_ENV === "production" ? "production" : undefined),
    PLATFORM_ADMIN_LOG_LEVEL: source.PLATFORM_ADMIN_LOG_LEVEL,
    PLATFORM_ADMIN_WEB_HOSTNAME: source.PLATFORM_ADMIN_WEB_HOSTNAME,
    PLATFORM_ADMIN_WEB_PORT: source.PLATFORM_ADMIN_WEB_PORT ?? source.PORT,
    PLATFORM_ADMIN_API_BASE_URL: source.PLATFORM_ADMIN_API_BASE_URL,
    PLATFORM_ADMIN_API_MODE: source.PLATFORM_ADMIN_API_MODE,
    PLATFORM_ADMIN_API_MOCK: source.PLATFORM_ADMIN_API_MOCK,
    PLATFORM_ADMIN_COOKIE_SECURE: source.PLATFORM_ADMIN_COOKIE_SECURE,
    PLATFORM_ADMIN_COOKIE_DOMAIN: source.PLATFORM_ADMIN_COOKIE_DOMAIN,
    PLATFORM_ADMIN_REQUEST_TIMEOUT_MS: source.PLATFORM_ADMIN_REQUEST_TIMEOUT_MS,
    PLATFORM_ADMIN_DEFAULT_PAGE_SIZE: source.PLATFORM_ADMIN_DEFAULT_PAGE_SIZE
  });

  const apiMock =
    parsed.PLATFORM_ADMIN_ENVIRONMENT === "mocked" ||
    parsed.PLATFORM_ADMIN_API_MODE === "mock" ||
    parsed.PLATFORM_ADMIN_API_MOCK === true;

  if (parsed.PLATFORM_ADMIN_ENVIRONMENT === "production" && apiMock) {
    throw new Error(
      "PLATFORM_ADMIN_ENVIRONMENT=production cannot run with the mocked API adapter."
    );
  }

  return {
    ...parsed,
    PLATFORM_ADMIN_API_MOCK: apiMock,
    PLATFORM_ADMIN_COOKIE_SECURE:
      parsed.PLATFORM_ADMIN_COOKIE_SECURE ?? parsed.PLATFORM_ADMIN_ENVIRONMENT === "production",
    PLATFORM_ADMIN_LOG_LEVEL:
      parsed.PLATFORM_ADMIN_LOG_LEVEL ??
      (parsed.PLATFORM_ADMIN_ENVIRONMENT === "development" ||
      parsed.PLATFORM_ADMIN_ENVIRONMENT === "mocked"
        ? "debug"
        : "info")
  };
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = parseServerEnv(process.env);

  return cachedEnv;
}

export function resetServerEnvCacheForTests() {
  cachedEnv = null;
}

export function publicConfig() {
  return {
    jobPollIntervalMs: Number(process.env.NEXT_PUBLIC_JOB_POLL_INTERVAL_MS ?? 5000)
  };
}
