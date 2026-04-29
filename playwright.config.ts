import { defineConfig, devices } from "@playwright/test";

const e2eProfile = process.env.PLATFORM_ADMIN_E2E_PROFILE ?? "mocked";
const webHost = process.env.PLATFORM_ADMIN_WEB_HOSTNAME ?? "127.0.0.1";
const webPort = Number(
  process.env.PLATFORM_ADMIN_WEB_PORT ?? (e2eProfile === "development" ? 3101 : 3100)
);
const baseURL = `http://${webHost}:${webPort}`;
const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  )
);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: e2eProfile === "development" ? 1 : undefined,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: `node scripts/run-next.mjs dev ${e2eProfile}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    env: webServerEnv
  },
  projects:
    e2eProfile === "development"
      ? [
          {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
          }
        ]
      : [
          {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
          },
          {
            name: "mobile",
            use: { ...devices["Pixel 7"] }
          }
        ]
});
