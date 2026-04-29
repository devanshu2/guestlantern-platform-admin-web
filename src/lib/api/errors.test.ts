import { describe, expect, it } from "vitest";
import { ApiError, normalizeError } from "@/lib/api/errors";

describe("error normalization", () => {
  it("preserves backend error envelopes", () => {
    const error = normalizeError(409, {
      error: { code: "conflict", message: "Active job already exists." }
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe("conflict");
    expect(error.message).toBe("Active job already exists.");
  });

  it("creates safe fallback messages for unexpected bodies", () => {
    const error = normalizeError(503, "service unavailable");

    expect(error.code).toBe("unexpected_error");
    expect(error.message).toContain("unexpected response");
  });
});
