import { getServerEnv } from "@/lib/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const priority: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

function shouldLog(level: LogLevel): boolean {
  const env = getServerEnv();
  return priority[level] >= priority[env.PLATFORM_ADMIN_LOG_LEVEL];
}

function write(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  if (!shouldLog(level)) return;

  const entry = {
    level,
    message,
    environment: getServerEnv().PLATFORM_ADMIN_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    ...context
  };

  console[level](JSON.stringify(entry));
}

export const serverLogger = {
  debug(message: string, context?: Record<string, unknown>) {
    write("debug", message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    write("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    write("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    write("error", message, context);
  }
};
