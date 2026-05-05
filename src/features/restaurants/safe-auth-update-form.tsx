"use client";

import { Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { RestaurantAuthConfig, RestaurantAuthConfigRequest } from "@/lib/api/types";
import { authConfigSchema, formatValidationIssue } from "@/lib/validation/platform";

export function SafeAuthUpdateForm({
  restaurantId,
  config,
  allowDevStaticOtpSupported,
  onSaved
}: {
  restaurantId: string;
  config?: RestaurantAuthConfig | null;
  allowDevStaticOtpSupported: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const initial = useMemo(
    () => ({
      access_token_ttl_seconds: String(config?.access_token_ttl_seconds ?? 900),
      refresh_token_ttl_seconds: String(config?.refresh_token_ttl_seconds ?? 2_592_000),
      allow_dev_static_otp: allowDevStaticOtpSupported && Boolean(config?.allow_dev_static_otp),
      dev_static_otp_code: config?.dev_static_otp_code ?? ""
    }),
    [allowDevStaticOtpSupported, config]
  );
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validationLabels = {
    access_token_ttl_seconds: "Access token TTL seconds",
    refresh_token_ttl_seconds: "Refresh token TTL seconds",
    dev_static_otp_code: "Development static OTP code"
  };

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function update(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!config) {
      setMessage("Auth config is missing; use Advanced repair before safe auth updates.");
      return;
    }

    const allowDevStaticOtp = allowDevStaticOtpSupported && form.allow_dev_static_otp;
    const payload: RestaurantAuthConfigRequest = {
      issuer: config.issuer,
      audience: config.audience,
      signing_algorithm: config.signing_algorithm,
      jwt_secret_ref: config.jwt_secret_ref,
      access_token_ttl_seconds: Number(form.access_token_ttl_seconds),
      refresh_token_ttl_seconds: Number(form.refresh_token_ttl_seconds),
      allow_dev_static_otp: allowDevStaticOtp,
      dev_static_otp_code: allowDevStaticOtp ? form.dev_static_otp_code : null
    };

    try {
      const parsed = authConfigSchema.safeParse(payload);
      if (!parsed.success) {
        setMessage(formatValidationIssue(parsed.error, validationLabels));
        return;
      }
      setLoading(true);
      await platformApi<RestaurantAuthConfig>(`/restaurants/${restaurantId}/auth-config`, {
        method: "PUT",
        body: parsed.data
      });
      setMessage("Safe auth settings saved. Unchanged auth fields were preserved.");
      await onSaved();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {message ? (
        <Alert tone={message.includes("saved") ? "success" : "danger"} live>
          {message}
        </Alert>
      ) : null}
      {!config ? (
        <Alert tone="warning">
          Auth config is missing. Safe updates are available after auth config exists.
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Access token TTL seconds"
          name="safe_access_token_ttl_seconds"
          type="number"
          value={form.access_token_ttl_seconds}
          onChange={(event) => update("access_token_ttl_seconds", event.target.value)}
          helper="Minimum 60 seconds. Other auth fields are preserved."
          disabled={!config}
          required
        />
        <Field
          label="Refresh token TTL seconds"
          name="safe_refresh_token_ttl_seconds"
          type="number"
          value={form.refresh_token_ttl_seconds}
          onChange={(event) => update("refresh_token_ttl_seconds", event.target.value)}
          helper="Must be greater than access TTL."
          disabled={!config}
          required
        />
      </div>
      {allowDevStaticOtpSupported ? (
        <>
          <CheckboxField
            label="Allow development static OTP"
            name="safe_allow_dev_static_otp"
            checked={form.allow_dev_static_otp}
            onChange={(checked) => update("allow_dev_static_otp", checked)}
            helper="Available only when the backend reports development provisioning capabilities."
          />
          {form.allow_dev_static_otp ? (
            <Field
              label="Development static OTP code"
              name="safe_dev_static_otp_code"
              value={form.dev_static_otp_code}
              onChange={(event) => update("dev_static_otp_code", event.target.value)}
              helper="Six digit development-only code."
              disabled={!config}
            />
          ) : null}
        </>
      ) : null}
      <Button
        type="submit"
        loading={loading}
        disabled={!config}
        icon={<Save aria-hidden className="h-4 w-4" />}
      >
        Save safe auth update
      </Button>
    </form>
  );
}
