"use client";

import { Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { RestaurantAuthConfig, RestaurantAuthConfigRequest } from "@/lib/api/types";
import { authConfigSchema } from "@/lib/validation/platform";

export function AuthConfigForm({
  restaurantId,
  config,
  onSaved
}: {
  restaurantId: string;
  config?: RestaurantAuthConfig | null;
  onSaved: () => Promise<void> | void;
}) {
  const initial = useMemo(
    () => ({
      issuer: config?.issuer ?? "smoke-provisioned.guestlantern.localhost",
      audience: config?.audience ?? "tenant-smoke-provisioned-clients",
      signing_algorithm: config?.signing_algorithm ?? "HS256",
      jwt_secret_ref: config?.jwt_secret_ref ?? "secret://smoke-provisioned-jwt-secret",
      access_token_ttl_seconds: String(config?.access_token_ttl_seconds ?? 900),
      refresh_token_ttl_seconds: String(config?.refresh_token_ttl_seconds ?? 2_592_000),
      allow_dev_static_otp: config?.allow_dev_static_otp ?? false,
      dev_static_otp_code: config?.dev_static_otp_code ?? ""
    }),
    [config]
  );
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const payload: RestaurantAuthConfigRequest = {
        issuer: form.issuer,
        audience: form.audience,
        signing_algorithm: form.signing_algorithm,
        jwt_secret_ref: form.jwt_secret_ref,
        access_token_ttl_seconds: Number(form.access_token_ttl_seconds),
        refresh_token_ttl_seconds: Number(form.refresh_token_ttl_seconds),
        allow_dev_static_otp: form.allow_dev_static_otp,
        dev_static_otp_code: form.dev_static_otp_code || null
      };
      const parsed = authConfigSchema.parse(payload);
      await platformApi<RestaurantAuthConfig>(`/restaurants/${restaurantId}/auth-config`, {
        method: "PUT",
        body: parsed
      });
      setMessage("Auth config saved. Tenant JWT and development OTP settings were updated.");
      await onSaved();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {message ? <Alert tone={message.includes("saved") ? "success" : "danger"} live>{message}</Alert> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Issuer" name="issuer" value={form.issuer} onChange={(event) => update("issuer", event.target.value)} helper="Tenant token issuer host. Example: smoke-provisioned.guestlantern.localhost." required />
        <Field label="Audience" name="audience" value={form.audience} onChange={(event) => update("audience", event.target.value)} helper="Tenant token audience. Example: tenant-smoke-provisioned-clients." required />
        <Field label="Signing algorithm" name="signing_algorithm" value={form.signing_algorithm} onChange={(event) => update("signing_algorithm", event.target.value)} helper="Current backend supports HS256." required />
        <Field label="JWT secret ref" name="jwt_secret_ref" value={form.jwt_secret_ref} onChange={(event) => update("jwt_secret_ref", event.target.value)} helper="Secret reference only. Example: secret://smoke-provisioned-jwt-secret." required />
        <Field label="Access token TTL seconds" name="access_token_ttl_seconds" type="number" value={form.access_token_ttl_seconds} onChange={(event) => update("access_token_ttl_seconds", event.target.value)} helper="Minimum 60 seconds. Common operator default: 900." required />
        <Field label="Refresh token TTL seconds" name="refresh_token_ttl_seconds" type="number" value={form.refresh_token_ttl_seconds} onChange={(event) => update("refresh_token_ttl_seconds", event.target.value)} helper="Must be greater than access TTL. Example: 2592000." required />
      </div>
      <CheckboxField
        label="Allow development static OTP"
        name="allow_dev_static_otp"
        checked={form.allow_dev_static_otp}
        onChange={(checked) => update("allow_dev_static_otp", checked)}
        helper="Use only for development or local smoke tests. Production OTP delivery remains a backend/operator task."
      />
      <Field
        label="Development static OTP code"
        name="dev_static_otp_code"
        value={form.dev_static_otp_code}
        onChange={(event) => update("dev_static_otp_code", event.target.value)}
        helper="Optional six digit code when static OTP is enabled. Example: 123456."
      />
      <Button type="submit" loading={loading} icon={<Save aria-hidden className="h-4 w-4" />}>
        Save auth config
      </Button>
    </form>
  );
}
