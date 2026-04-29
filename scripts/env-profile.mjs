import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment profile not found: ${filePath}`);
  }

  const values = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function profilePath(profile) {
  return path.join(projectRoot, "env", `${profile}.env`);
}

export function loadEnvProfile(profile, overrides = {}) {
  const profileValues = parseEnvFile(profilePath(profile));
  return {
    ...process.env,
    ...profileValues,
    PLATFORM_ADMIN_ENVIRONMENT: profileValues.PLATFORM_ADMIN_ENVIRONMENT ?? profile,
    ...overrides
  };
}

export function nextBinPath() {
  return path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next"
  );
}

export function playwrightBinPath() {
  return path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "playwright.cmd" : "playwright"
  );
}
