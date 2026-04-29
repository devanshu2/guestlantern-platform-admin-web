#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { projectRoot } from "./env-profile.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ["scripts/docker-platform-admin-backend.mjs", "up"]);
run(process.execPath, [
  "scripts/run-playwright.mjs",
  "development",
  "tests/e2e/platform-admin-backend.spec.ts"
]);
