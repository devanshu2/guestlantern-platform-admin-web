#!/usr/bin/env node
import { spawn } from "node:child_process";
import { loadEnvProfile, nextBinPath } from "./env-profile.mjs";

const [command = "dev", profileArg, ...extraArgs] = process.argv.slice(2);
const profile =
  profileArg && !profileArg.startsWith("-")
    ? profileArg
    : (process.env.PLATFORM_ADMIN_ENVIRONMENT ??
      (command === "start" ? "production" : "development"));
const args = profileArg && profileArg.startsWith("-") ? [profileArg, ...extraArgs] : extraArgs;
const env = loadEnvProfile(profile);
const port =
  process.env.PORT ??
  process.env.PLATFORM_ADMIN_WEB_PORT ??
  env.PORT ??
  env.PLATFORM_ADMIN_WEB_PORT ??
  "3000";
const hostname =
  process.env.PLATFORM_ADMIN_WEB_HOSTNAME ??
  env.PLATFORM_ADMIN_WEB_HOSTNAME ??
  process.env.HOSTNAME ??
  env.HOSTNAME ??
  "127.0.0.1";

env.PORT = port;
env.HOSTNAME = hostname;
env.PLATFORM_ADMIN_WEB_PORT = port;
env.PLATFORM_ADMIN_WEB_HOSTNAME = hostname;

const nextArgs = [command, ...args];
if (
  (command === "dev" || command === "start") &&
  !args.includes("--port") &&
  !args.includes("-p")
) {
  nextArgs.push("--port", port);
}
if (
  (command === "dev" || command === "start") &&
  !args.includes("--hostname") &&
  !args.includes("-H")
) {
  nextArgs.push("--hostname", hostname);
}

const child = spawn(nextBinPath(), nextArgs, {
  cwd: process.cwd(),
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
