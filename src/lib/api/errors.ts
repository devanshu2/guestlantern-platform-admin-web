import type { HttpErrorBody, HttpErrorDetails } from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, details: HttpErrorDetails) {
    super(details.message);
    this.name = "ApiError";
    this.status = status;
    this.code = details.code;
  }
}

export function isErrorBody(value: unknown): value is HttpErrorBody {
  if (!value || typeof value !== "object") return false;
  const body = value as { error?: { code?: unknown; message?: unknown } };
  return (
    typeof body.error?.code === "string" &&
    typeof body.error?.message === "string"
  );
}

export function normalizeError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) {
    return new ApiError(status, body.error);
  }

  return new ApiError(status, {
    code: status === 401 ? "unauthorized" : "unexpected_error",
    message:
      status === 401
        ? "Your platform admin session is no longer valid. Sign in again."
        : "The platform admin service returned an unexpected response."
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
