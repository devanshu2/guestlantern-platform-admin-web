#!/usr/bin/env node
import { spawn } from "node:child_process";
import { loadEnvProfile, playwrightBinPath } from "./env-profile.mjs";

const [profile = "mocked", ...playwrightArgs] = process.argv.slice(2);
const defaultPort = profile === "development" ? "3101" : "3100";
const env = loadEnvProfile(profile, {
  PLATFORM_ADMIN_E2E_PROFILE: profile,
  PLATFORM_ADMIN_WEB_PORT: process.env.PLATFORM_ADMIN_WEB_PORT ?? defaultPort,
  PLATFORM_ADMIN_WEB_HOSTNAME: process.env.PLATFORM_ADMIN_WEB_HOSTNAME ?? "127.0.0.1",
  NEXT_PUBLIC_JOB_POLL_INTERVAL_MS: process.env.NEXT_PUBLIC_JOB_POLL_INTERVAL_MS ?? "1000"
});

const child = spawn(playwrightBinPath(), ["test", ...playwrightArgs], {
  cwd: process.cwd(),
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
