import { z } from "zod";

export const uuidSchema = z
  .string()
  .trim()
  .uuid("Use a valid UUID, for example 33333333-3333-4333-8333-333333333333.");

export const optionalUuidSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  uuidSchema.optional()
);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(48, "Use 48 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use kebab format, for example smoke-provisioned.");

export const hostSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter a hostname.")
  .regex(/^[a-z0-9.-]+$/, "Use a lowercase hostname with letters, numbers, dots, and hyphens.");

export const secretRefSchema = z
  .string()
  .trim()
  .regex(/^secret:\/\/[a-zA-Z0-9._/-]+$/, "Use a secret ref such as secret://tenant-db-password.");

export const provisionRestaurantSchema = z.object({
  tenant_id: optionalUuidSchema,
  external_code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "External code is required.")
    .max(50, "Use 50 characters or fewer."),
  slug: slugSchema,
  legal_name: z
    .string()
    .trim()
    .min(2, "Legal name is required.")
    .max(255, "Use 255 characters or fewer."),
  display_name: z
    .string()
    .trim()
    .min(2, "Display name is required.")
    .max(255, "Use 255 characters or fewer."),
  owner_full_name: z
    .string()
    .trim()
    .min(2, "Owner name is required.")
    .max(120, "Use 120 characters or fewer."),
  owner_phone_number: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +913333333333."),
  owner_email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Use a valid email address.")
      .max(255, "Use 255 characters or fewer.")
      .optional()
  ),
  schema_version: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).max(50, "Use 50 characters or fewer.").optional()
  )
});

export const restaurantDomainSchema = z.object({
  host: hostSchema,
  domain_type: z.enum(["subdomain", "custom"]),
  is_primary: z.boolean().default(false)
});

export const databaseConfigSchema = z.object({
  db_name: z
    .string()
    .trim()
    .min(1, "Database name is required.")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Use a PostgreSQL-safe database name."),
  db_host: z.string().trim().min(1, "Database host is required."),
  db_port: z.coerce.number().int().min(1).max(65_535),
  db_user_secret_ref: secretRefSchema,
  db_password_secret_ref: secretRefSchema,
  schema_version: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).optional()
  ),
  connection_options: z.record(z.string(), z.unknown()).default({})
});

export const authConfigSchema = z
  .object({
    issuer: hostSchema,
    audience: z.string().trim().min(1, "Audience is required."),
    signing_algorithm: z.literal("HS256", {
      message: "The current backend supports HS256."
    }),
    jwt_secret_ref: secretRefSchema,
    access_token_ttl_seconds: z.coerce.number().int().min(60),
    refresh_token_ttl_seconds: z.coerce.number().int().min(61),
    allow_dev_static_otp: z.boolean(),
    dev_static_otp_code: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z
        .string()
        .regex(/^\d{6}$/, "Use a 6 digit static OTP.")
        .optional()
    )
  })
  .refine((value) => value.refresh_token_ttl_seconds > value.access_token_ttl_seconds, {
    path: ["refresh_token_ttl_seconds"],
    message: "Refresh token TTL must be greater than access token TTL."
  });

export function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Connection options must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
