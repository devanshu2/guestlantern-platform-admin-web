#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { projectRoot } from "./env-profile.mjs";

const [action = "mocked"] = process.argv.slice(2);
const frontendProfiles = [
  "--profile",
  "mocked",
  "--profile",
  "development",
  "--profile",
  "production"
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function dockerCompose(args) {
  run("docker", ["compose", ...args]);
}

function ensureBackend() {
  run(process.execPath, ["scripts/docker-platform-admin-backend.mjs", "up"]);
}

switch (action) {
  case "build":
    dockerCompose(["--profile", "production", "build", "platform-admin-web-production"]);
    break;
  case "mocked":
    dockerCompose(["--profile", "mocked", "up", "--build", "platform-admin-web-mocked"]);
    break;
  case "development":
    ensureBackend();
    dockerCompose(["--profile", "development", "up", "--build", "platform-admin-web-development"]);
    break;
  case "production":
    ensureBackend();
    dockerCompose(["--profile", "production", "up", "--build", "platform-admin-web-production"]);
    break;
  case "down":
    dockerCompose([...frontendProfiles, "down", "--remove-orphans"]);
    break;
  default:
    console.error(`Unknown Docker web action: ${action}`);
    console.error("Use one of: build, mocked, development, production, down.");
    process.exit(1);
}
