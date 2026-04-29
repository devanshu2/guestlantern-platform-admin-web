import { z } from "zod";

const envSchema = z.object({
  PLATFORM_ADMIN_API_BASE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:8080"),
  PLATFORM_ADMIN_API_MOCK: z
    .enum(["0", "1", "false", "true"])
    .default("0")
    .transform((value) => value === "1" || value === "true"),
  PLATFORM_ADMIN_COOKIE_SECURE: z
    .enum(["0", "1", "false", "true"])
    .optional()
    .transform((value) =>
      value == null ? process.env.NODE_ENV === "production" : value === "1" || value === "true"
    ),
  PLATFORM_ADMIN_COOKIE_DOMAIN: z.string().optional(),
  PLATFORM_ADMIN_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  PLATFORM_ADMIN_DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(25)
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = envSchema.parse({
    PLATFORM_ADMIN_API_BASE_URL: process.env.PLATFORM_ADMIN_API_BASE_URL,
    PLATFORM_ADMIN_API_MOCK: process.env.PLATFORM_ADMIN_API_MOCK,
    PLATFORM_ADMIN_COOKIE_SECURE: process.env.PLATFORM_ADMIN_COOKIE_SECURE,
    PLATFORM_ADMIN_COOKIE_DOMAIN: process.env.PLATFORM_ADMIN_COOKIE_DOMAIN,
    PLATFORM_ADMIN_REQUEST_TIMEOUT_MS: process.env.PLATFORM_ADMIN_REQUEST_TIMEOUT_MS,
    PLATFORM_ADMIN_DEFAULT_PAGE_SIZE: process.env.PLATFORM_ADMIN_DEFAULT_PAGE_SIZE
  });

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
