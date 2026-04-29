import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/config/env";

describe("server environment parsing", () => {
  it("derives mocked API mode from the mocked environment profile", () => {
    const env = parseServerEnv({
      PLATFORM_ADMIN_ENVIRONMENT: "mocked",
      PLATFORM_ADMIN_API_BASE_URL: "http://127.0.0.1:8080",
      PLATFORM_ADMIN_COOKIE_SECURE: "false"
    });

    expect(env.PLATFORM_ADMIN_API_MOCK).toBe(true);
    expect(env.PLATFORM_ADMIN_LOG_LEVEL).toBe("debug");
  });

  it("uses PORT as the configurable web port fallback", () => {
    const env = parseServerEnv({
      PLATFORM_ADMIN_ENVIRONMENT: "development",
      PLATFORM_ADMIN_API_BASE_URL: "http://127.0.0.1:18080",
      PORT: "3200"
    });

    expect(env.PLATFORM_ADMIN_WEB_PORT).toBe(3200);
    expect(env.PLATFORM_ADMIN_API_MOCK).toBe(false);
  });

  it("rejects production profile with mock API enabled", () => {
    expect(() =>
      parseServerEnv({
        PLATFORM_ADMIN_ENVIRONMENT: "production",
        PLATFORM_ADMIN_API_BASE_URL: "https://platform-api.example.com",
        PLATFORM_ADMIN_API_MODE: "mock"
      })
    ).toThrow("production cannot run with the mocked API adapter");
  });
});
