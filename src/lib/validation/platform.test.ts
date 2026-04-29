import { describe, expect, it } from "vitest";
import {
  authConfigSchema,
  databaseConfigSchema,
  parseJsonObject,
  provisionRestaurantSchema
} from "@/lib/validation/platform";

describe("platform validation", () => {
  it("accepts a valid provisioning request", () => {
    const result = provisionRestaurantSchema.safeParse({
      tenant_id: "",
      external_code: "SMOKE",
      slug: "smoke-provisioned",
      legal_name: "Smoke Provisioned Foods Pvt Ltd",
      display_name: "Smoke Provisioned Foods",
      owner_full_name: "Smoke Owner",
      owner_phone_number: "+913333333333",
      owner_email: "owner@smoke.test",
      schema_version: "restaurant_template/0001_init.sql"
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe secret refs", () => {
    const result = databaseConfigSchema.safeParse({
      db_name: "tenant_smoke",
      db_host: "127.0.0.1",
      db_port: 16432,
      db_user_secret_ref: "plain-user",
      db_password_secret_ref: "secret://tenant-password",
      connection_options: {}
    });

    expect(result.success).toBe(false);
  });

  it("requires refresh TTL to exceed access TTL", () => {
    const result = authConfigSchema.safeParse({
      issuer: "smoke-provisioned.guestlantern.localhost",
      audience: "tenant-smoke-clients",
      signing_algorithm: "HS256",
      jwt_secret_ref: "secret://jwt",
      access_token_ttl_seconds: 900,
      refresh_token_ttl_seconds: 900,
      allow_dev_static_otp: false
    });

    expect(result.success).toBe(false);
  });

  it("parses JSON objects for connection options", () => {
    expect(parseJsonObject('{ "pool_mode": "transaction" }')).toEqual({
      pool_mode: "transaction"
    });
    expect(() => parseJsonObject("[1,2,3]")).toThrow("JSON object");
  });
});
