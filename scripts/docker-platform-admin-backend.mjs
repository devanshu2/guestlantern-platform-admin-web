#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { projectRoot } from "./env-profile.mjs";

const backendRoot = path.resolve(projectRoot, "..", "backend");
const envFile = path.join(backendRoot, "env", "development", "infra.env");
const action = process.argv[2] ?? "up";

function dockerCompose(args, env = process.env) {
  const result = spawnSync(
    "docker",
    ["compose", "--project-directory", backendRoot, "--env-file", envFile, ...args],
    {
      cwd: backendRoot,
      env,
      stdio: "inherit"
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function waitForReady() {
  const started = Date.now();
  const timeoutMs = 120_000;

  while (Date.now() - started < timeoutMs) {
    const result = spawnSync("curl", ["-fsS", "http://127.0.0.1:18080/health/ready"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    if (result.status === 0 && result.stdout.includes('"ready":true')) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  console.error("platform-admin-api did not become ready on http://127.0.0.1:18080");
  process.exit(1);
}

function imageExists() {
  const result = spawnSync("docker", ["image", "inspect", "guestlantern-backend-local"], {
    stdio: "ignore"
  });
  return result.status === 0;
}

if (action === "down") {
  dockerCompose(["--profile", "apps", "stop", "platform-admin-api"]);
  dockerCompose(["--profile", "apps", "rm", "-f", "platform-admin-api"]);
  process.exit(0);
}

if (action !== "up") {
  console.error(`Unknown action: ${action}. Use "up" or "down".`);
  process.exit(1);
}

dockerCompose(["up", "-d", "postgres", "pgbouncer", "dragonfly", "garage"]);
dockerCompose(["--profile", "init", "run", "--rm", "db-bootstrap"]);
dockerCompose(["--profile", "init", "run", "--rm", "dragonfly-acl-init"]);
dockerCompose(["--profile", "init", "run", "--rm", "garage-init"]);
const shouldBuild =
  process.env.PLATFORM_ADMIN_BACKEND_DOCKER_BUILD === "1" ||
  process.env.PLATFORM_ADMIN_BACKEND_DOCKER_BUILD === "true" ||
  !imageExists();
dockerCompose([
  "--profile",
  "apps",
  "up",
  "-d",
  ...(shouldBuild ? ["--build"] : []),
  "platform-admin-api"
]);
waitForReady();
