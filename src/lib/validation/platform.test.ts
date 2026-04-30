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

  it("accepts provisioning without a tenant ID so the backend can generate one", () => {
    const result = provisionRestaurantSchema.parse({
      external_code: "SMOKE",
      slug: "smoke-provisioned",
      legal_name: "Smoke Provisioned Foods Pvt Ltd",
      display_name: "Smoke Provisioned Foods",
      owner_full_name: "Smoke Owner",
      owner_phone_number: "+913333333333",
      owner_email: "owner@smoke.test",
      schema_version: "restaurant_template/0001_init.sql"
    });

    expect(result.tenant_id).toBeUndefined();
  });

  it("normalizes provisioning fields like the backend", () => {
    const result = provisionRestaurantSchema.parse({
      tenant_id: "",
      external_code: " smoke-provisioned ",
      slug: "Smoke-Provisioned",
      legal_name: " Smoke Provisioned Foods Pvt Ltd ",
      display_name: " Smoke Provisioned Foods ",
      owner_full_name: " Smoke Owner ",
      owner_phone_number: " +913333333333 ",
      owner_email: " OWNER@SMOKE.TEST ",
      schema_version: ""
    });

    expect(result).toMatchObject({
      tenant_id: undefined,
      external_code: "SMOKE-PROVISIONED",
      slug: "smoke-provisioned",
      legal_name: "Smoke Provisioned Foods Pvt Ltd",
      display_name: "Smoke Provisioned Foods",
      owner_full_name: "Smoke Owner",
      owner_phone_number: "+913333333333",
      owner_email: "owner@smoke.test",
      schema_version: undefined
    });
  });

  it("rejects provisioning values that exceed backend storage limits", () => {
    const base = {
      external_code: "SMOKE",
      slug: "smoke-provisioned",
      legal_name: "Smoke Provisioned Foods Pvt Ltd",
      display_name: "Smoke Provisioned Foods",
      owner_full_name: "Smoke Owner",
      owner_phone_number: "+913333333333",
      owner_email: "owner@smoke.test",
      schema_version: "restaurant_template/0001_init.sql"
    };

    expect(
      provisionRestaurantSchema.safeParse({
        ...base,
        external_code: "X".repeat(51)
      }).success
    ).toBe(false);
    expect(
      provisionRestaurantSchema.safeParse({
        ...base,
        slug: "a".repeat(49)
      }).success
    ).toBe(false);
    expect(
      provisionRestaurantSchema.safeParse({
        ...base,
        owner_full_name: "A".repeat(121)
      }).success
    ).toBe(false);
    expect(
      provisionRestaurantSchema.safeParse({
        ...base,
        schema_version: "x".repeat(51)
      }).success
    ).toBe(false);
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
