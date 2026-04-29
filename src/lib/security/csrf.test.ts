import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { CSRF_COOKIE } from "@/lib/security/cookie-names";
import { CSRF_HEADER, verifyCsrf } from "@/lib/security/csrf";

describe("CSRF verification", () => {
  it("allows safe methods without a token", () => {
    const request = new NextRequest("http://localhost/api/platform/bootstrap");
    expect(verifyCsrf(request)).toBe(true);
  });

  it("requires matching header and cookie for mutations", () => {
    const request = new NextRequest("http://localhost/api/platform/restaurants/provision", {
      method: "POST",
      headers: {
        cookie: `${CSRF_COOKIE}=abc123`,
        [CSRF_HEADER]: "abc123"
      }
    });

    expect(verifyCsrf(request)).toBe(true);
  });

  it("rejects mismatched mutation tokens", () => {
    const request = new NextRequest("http://localhost/api/platform/restaurants/provision", {
      method: "POST",
      headers: {
        cookie: `${CSRF_COOKIE}=abc123`,
        [CSRF_HEADER]: "different"
      }
    });

    expect(verifyCsrf(request)).toBe(false);
  });
});
