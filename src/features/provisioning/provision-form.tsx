"use client";

import { ClipboardCheck, Plus, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, SelectField, TextAreaField } from "@/components/ui/field";
import { KeyValue } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type {
  ProvisionRestaurantJobReceipt,
  ProvisionRestaurantPreview,
  ProvisionRestaurantRequest
} from "@/lib/api/types";
import {
  formatValidationIssue,
  parseJsonObject,
  provisionRestaurantSchema,
  provisionRestaurantWithConfigSchema
} from "@/lib/validation/platform";

type IdentityFormState = {
  external_code: string;
  slug: string;
  legal_name: string;
  display_name: string;
  owner_full_name: string;
  owner_phone_number: string;
  owner_email: string;
  schema_version: string;
};

type AdvancedState = {
  domain_host: string;
  domain_type: "subdomain" | "custom";
  domain_is_primary: boolean;
  db_name: string;
  db_host: string;
  db_port: string;
  db_user_secret_ref: string;
  db_password_secret_ref: string;
  db_schema_version: string;
  connection_options: string;
  issuer: string;
  audience: string;
  signing_algorithm: string;
  jwt_secret_ref: string;
  access_token_ttl_seconds: string;
  refresh_token_ttl_seconds: string;
  allow_dev_static_otp: boolean;
  dev_static_otp_code: string;
};

const initialState: IdentityFormState = {
  external_code: "",
  slug: "",
  legal_name: "",
  display_name: "",
  owner_full_name: "",
  owner_phone_number: "",
  owner_email: "",
  schema_version: "restaurant_template/0001_init.sql"
};

const identityFieldNames = new Set<keyof IdentityFormState>([
  "external_code",
  "slug",
  "legal_name",
  "display_name",
  "owner_full_name",
  "owner_phone_number",
  "owner_email",
  "schema_version"
]);

const advancedValidationLabels = {
  "domain.host": "Primary host",
  "domain.domain_type": "Domain type",
  "database.db_name": "Database name",
  "database.db_host": "Database host",
  "database.db_port": "Database port",
  "database.db_user_secret_ref": "DB user secret ref",
  "database.db_password_secret_ref": "DB password secret ref",
  "database.schema_version": "DB schema version",
  "auth.issuer": "Issuer",
  "auth.audience": "Audience",
  "auth.signing_algorithm": "Signing algorithm",
  "auth.jwt_secret_ref": "JWT secret ref",
  "auth.access_token_ttl_seconds": "Access token TTL seconds",
  "auth.refresh_token_ttl_seconds": "Refresh token TTL seconds",
  "auth.dev_static_otp_code": "Development static OTP code"
};

function issueMap(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const pairs = error.issues
    .map((issue) => [String(issue.path[0]), issue.message] as const)
    .filter(([name]) => identityFieldNames.has(name as keyof IdentityFormState));
  return Object.fromEntries(pairs) as Partial<Record<keyof IdentityFormState, string>>;
}

function advancedFromPreview(preview: ProvisionRestaurantPreview): AdvancedState {
  return {
    domain_host: preview.domain.host,
    domain_type: preview.domain.domain_type === "subdomain" ? "subdomain" : "custom",
    domain_is_primary: preview.domain.is_primary,
    db_name: preview.database.db_name,
    db_host: preview.database.db_host,
    db_port: String(preview.database.db_port),
    db_user_secret_ref: preview.database.db_user_secret_ref,
    db_password_secret_ref: preview.database.db_password_secret_ref,
    db_schema_version: preview.database.schema_version,
    connection_options: JSON.stringify(preview.database.connection_options ?? {}, null, 2),
    issuer: preview.auth.issuer,
    audience: preview.auth.audience,
    signing_algorithm: preview.auth.signing_algorithm,
    jwt_secret_ref: preview.auth.jwt_secret_ref,
    access_token_ttl_seconds: String(preview.auth.access_token_ttl_seconds),
    refresh_token_ttl_seconds: String(preview.auth.refresh_token_ttl_seconds),
    allow_dev_static_otp:
      preview.capabilities.allow_dev_static_otp_supported && preview.auth.allow_dev_static_otp,
    dev_static_otp_code: preview.auth.dev_static_otp_code ?? ""
  };
}

function buildAdvancedPayload(advanced: AdvancedState, supportsDevStaticOtp: boolean) {
  const allowDevStaticOtp = supportsDevStaticOtp && advanced.allow_dev_static_otp;
  return {
    domain: {
      host: advanced.domain_host,
      domain_type: advanced.domain_type,
      is_primary: advanced.domain_is_primary
    },
    database: {
      db_name: advanced.db_name,
      db_host: advanced.db_host,
      db_port: Number(advanced.db_port),
      db_user_secret_ref: advanced.db_user_secret_ref,
      db_password_secret_ref: advanced.db_password_secret_ref,
      schema_version: advanced.db_schema_version || undefined,
      connection_options: parseJsonObject(advanced.connection_options)
    },
    auth: {
      issuer: advanced.issuer,
      audience: advanced.audience,
      signing_algorithm: advanced.signing_algorithm,
      jwt_secret_ref: advanced.jwt_secret_ref,
      access_token_ttl_seconds: Number(advanced.access_token_ttl_seconds),
      refresh_token_ttl_seconds: Number(advanced.refresh_token_ttl_seconds),
      allow_dev_static_otp: allowDevStaticOtp,
      dev_static_otp_code: allowDevStaticOtp ? advanced.dev_static_otp_code : null
    }
  };
}

export function ProvisionForm() {
  const [form, setForm] = useState<IdentityFormState>(initialState);
  const [advanced, setAdvanced] = useState<AdvancedState | null>(null);
  const [preview, setPreview] = useState<ProvisionRestaurantPreview | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof IdentityFormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ProvisionRestaurantJobReceipt | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  function update(name: keyof IdentityFormState, value: string) {
    const normalized =
      name === "external_code"
        ? value.toUpperCase()
        : name === "slug" || name === "owner_email"
          ? value.toLowerCase()
          : value;
    setForm((current) => ({ ...current, [name]: normalized }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setPreview(null);
    setAdvanced(null);
    setPreviewError(null);
  }

  function updateAdvanced(name: keyof AdvancedState, value: string | boolean) {
    setAdvanced((current) => (current ? { ...current, [name]: value } : current));
  }

  async function loadPreview() {
    setPreviewError(null);
    setSubmitError(null);
    const parsed = provisionRestaurantSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(issueMap(parsed.error));
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await platformApi<ProvisionRestaurantPreview>(
        "/restaurants/provision/preview",
        {
          method: "POST",
          body: parsed.data
        }
      );
      setPreview(response);
      setAdvanced(advancedFromPreview(response));
      setErrors({});
    } catch (err) {
      setPreviewError(errorMessage(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setReceipt(null);

    const identity = provisionRestaurantSchema.safeParse(form);
    if (!identity.success) {
      setErrors(issueMap(identity.error));
      return;
    }

    let payload: ProvisionRestaurantRequest = identity.data;
    if (advanced && preview) {
      try {
        payload = {
          ...identity.data,
          ...buildAdvancedPayload(advanced, preview.capabilities.allow_dev_static_otp_supported)
        };
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Advanced configuration is invalid.");
        return;
      }
      const parsed = provisionRestaurantWithConfigSchema.safeParse(payload);
      if (!parsed.success) {
        setSubmitError(formatValidationIssue(parsed.error, advancedValidationLabels));
        return;
      }
      payload = parsed.data;
    }

    setLoading(true);
    try {
      const response = await platformApi<ProvisionRestaurantJobReceipt>("/restaurants/provision", {
        method: "POST",
        body: payload
      });
      setReceipt(response);
      setForm(initialState);
      setAdvanced(null);
      setPreview(null);
      setErrors({});
      setShowForm(false);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function startAnotherProvisioningRequest() {
    setReceipt(null);
    setSubmitError(null);
    setPreviewError(null);
    setErrors({});
    setForm(initialState);
    setAdvanced(null);
    setPreview(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant onboarding"
        title="Provision restaurant"
        description="Create the restaurant and queue provisioning with one backend request. Advanced configuration is previewed by the backend and applied before the job is queued."
      />

      {receipt ? (
        <Alert tone="success" title="Provisioning queued" live>
          The backend accepted the request. The form has been cleared to prevent duplicate
          submissions.
        </Alert>
      ) : null}
      {submitError ? (
        <Alert tone="danger" title="Provisioning request failed" live>
          {submitError}
        </Alert>
      ) : null}

      {showForm ? (
        <Panel
          title="Restaurant identity"
          description="These values create the control-plane restaurant record. The backend derives managed hosts, runtime metadata, and secret references from this identity."
        >
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="External code"
                name="external_code"
                value={form.external_code}
                onChange={(event) => update("external_code", event.target.value)}
                helper="Operator-facing identifier stored uppercase. 50 characters max. Example: SMOKE-PROVISIONED."
                error={errors.external_code}
                maxLength={50}
                required
              />
              <Field
                label="Slug"
                name="slug"
                value={form.slug}
                onChange={(event) => update("slug", event.target.value)}
                helper="Managed-host slug. Use letters, numbers, and single hyphens. 48 characters max."
                error={errors.slug}
                placeholder="smoke-provisioned"
                maxLength={48}
                required
              />
              <Field
                label="Schema version"
                name="schema_version"
                value={form.schema_version}
                onChange={(event) => update("schema_version", event.target.value)}
                helper="Optional tenant schema template. Current default: restaurant_template/0001_init.sql."
                error={errors.schema_version}
                maxLength={80}
              />
              <Field
                label="Legal name"
                name="legal_name"
                value={form.legal_name}
                onChange={(event) => update("legal_name", event.target.value)}
                helper="Registered business name. Example: Smoke Provisioned Foods Pvt Ltd."
                error={errors.legal_name}
                maxLength={255}
                required
              />
              <Field
                label="Display name"
                name="display_name"
                value={form.display_name}
                onChange={(event) => update("display_name", event.target.value)}
                helper="Name shown to operators and tenant apps. Example: Smoke Provisioned Foods."
                error={errors.display_name}
                maxLength={255}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Owner full name"
                name="owner_full_name"
                value={form.owner_full_name}
                onChange={(event) => update("owner_full_name", event.target.value)}
                helper="Primary owner or onboarding contact. Example: Smoke Owner."
                error={errors.owner_full_name}
                maxLength={120}
                required
              />
              <Field
                label="Owner phone number"
                name="owner_phone_number"
                type="tel"
                inputMode="tel"
                value={form.owner_phone_number}
                onChange={(event) => update("owner_phone_number", event.target.value)}
                helper="Use E.164 format. Example: +913333333333."
                error={errors.owner_phone_number}
                placeholder="+913333333333"
                maxLength={16}
                required
              />
              <Field
                label="Owner email"
                name="owner_email"
                type="email"
                value={form.owner_email}
                onChange={(event) => update("owner_email", event.target.value)}
                helper="Optional support/onboarding email, stored lowercase. Example: owner@smoke-provisioned.test."
                error={errors.owner_email}
                maxLength={255}
              />
            </div>

            <div className="border-t border-line pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Advanced configuration</h2>
                  <p className="mt-1 text-sm text-muted">
                    Load backend suggestions before changing domain, database, auth, TTL, or
                    development OTP settings.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadPreview}
                  loading={previewLoading}
                  icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
                >
                  Load suggestions
                </Button>
              </div>

              {previewError ? (
                <div className="mt-4">
                  <Alert tone="danger" live>
                    {previewError}
                  </Alert>
                </div>
              ) : null}

              {preview && advanced ? (
                <div className="mt-5 space-y-5">
                  <KeyValue
                    items={[
                      { label: "Managed public host", value: preview.managed_public_host },
                      { label: "Effective public host", value: preview.public_host },
                      { label: "Admin host", value: preview.admin_host },
                      { label: "Environment", value: preview.capabilities.environment },
                      { label: "Secret store", value: preview.capabilities.secret_store_backend }
                    ]}
                  />

                  <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                    <Field
                      label="Primary host"
                      name="advanced_domain_host"
                      value={advanced.domain_host}
                      onChange={(event) => updateAdvanced("domain_host", event.target.value)}
                      helper="Use the exact lowercase host to route."
                      required
                    />
                    <SelectField
                      label="Domain type"
                      name="advanced_domain_type"
                      value={advanced.domain_type}
                      onChange={(event) =>
                        updateAdvanced(
                          "domain_type",
                          event.target.value === "subdomain" ? "subdomain" : "custom"
                        )
                      }
                      helper="Backend accepts subdomain or custom."
                    >
                      <option value="subdomain">Subdomain</option>
                      <option value="custom">Custom</option>
                    </SelectField>
                  </div>
                  <CheckboxField
                    label="Create as primary domain"
                    name="advanced_domain_primary"
                    checked={advanced.domain_is_primary}
                    onChange={(checked) => updateAdvanced("domain_is_primary", checked)}
                    helper="The selected host becomes the restaurant public host before provisioning starts."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Database name"
                      name="advanced_db_name"
                      value={advanced.db_name}
                      onChange={(event) => updateAdvanced("db_name", event.target.value)}
                      helper="Lowercase tenant database name. Spaces, hyphens, uppercase, and names over 48 characters are rejected by the backend."
                      required
                    />
                    <Field
                      label="Database host"
                      name="advanced_db_host"
                      value={advanced.db_host}
                      onChange={(event) => updateAdvanced("db_host", event.target.value)}
                      helper="Runtime database host or PgBouncer target."
                      required
                    />
                    <Field
                      label="Database port"
                      name="advanced_db_port"
                      type="number"
                      value={advanced.db_port}
                      onChange={(event) => updateAdvanced("db_port", event.target.value)}
                      required
                    />
                    <Field
                      label="DB schema version"
                      name="advanced_db_schema_version"
                      value={advanced.db_schema_version}
                      onChange={(event) => updateAdvanced("db_schema_version", event.target.value)}
                    />
                    <Field
                      label="DB user secret ref"
                      name="advanced_db_user_secret_ref"
                      value={advanced.db_user_secret_ref}
                      onChange={(event) => updateAdvanced("db_user_secret_ref", event.target.value)}
                      helper="Secret reference only; generated values stay server-side."
                      required
                    />
                    <Field
                      label="DB password secret ref"
                      name="advanced_db_password_secret_ref"
                      value={advanced.db_password_secret_ref}
                      onChange={(event) =>
                        updateAdvanced("db_password_secret_ref", event.target.value)
                      }
                      helper="Secret reference only."
                      required
                    />
                  </div>
                  <TextAreaField
                    label="Connection options"
                    name="advanced_connection_options"
                    value={advanced.connection_options}
                    onChange={(event) => updateAdvanced("connection_options", event.target.value)}
                    helper='JSON object forwarded to the backend. Example: { "pool_mode": "transaction" }.'
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Issuer"
                      name="advanced_issuer"
                      value={advanced.issuer}
                      onChange={(event) => updateAdvanced("issuer", event.target.value)}
                      helper="Tenant token issuer host."
                      required
                    />
                    <Field
                      label="Audience"
                      name="advanced_audience"
                      value={advanced.audience}
                      onChange={(event) => updateAdvanced("audience", event.target.value)}
                      required
                    />
                    <Field
                      label="Signing algorithm"
                      name="advanced_signing_algorithm"
                      value={advanced.signing_algorithm}
                      onChange={(event) => updateAdvanced("signing_algorithm", event.target.value)}
                      helper="Current backend supports HS256."
                      required
                    />
                    <Field
                      label="JWT secret ref"
                      name="advanced_jwt_secret_ref"
                      value={advanced.jwt_secret_ref}
                      onChange={(event) => updateAdvanced("jwt_secret_ref", event.target.value)}
                      helper="Secret reference only; the browser never sees the JWT signing secret."
                      required
                    />
                    <Field
                      label="Access token TTL seconds"
                      name="advanced_access_token_ttl_seconds"
                      type="number"
                      value={advanced.access_token_ttl_seconds}
                      onChange={(event) =>
                        updateAdvanced("access_token_ttl_seconds", event.target.value)
                      }
                      required
                    />
                    <Field
                      label="Refresh token TTL seconds"
                      name="advanced_refresh_token_ttl_seconds"
                      type="number"
                      value={advanced.refresh_token_ttl_seconds}
                      onChange={(event) =>
                        updateAdvanced("refresh_token_ttl_seconds", event.target.value)
                      }
                      required
                    />
                  </div>

                  {preview.capabilities.allow_dev_static_otp_supported ? (
                    <>
                      <CheckboxField
                        label="Allow development static OTP"
                        name="advanced_allow_dev_static_otp"
                        checked={advanced.allow_dev_static_otp}
                        onChange={(checked) => updateAdvanced("allow_dev_static_otp", checked)}
                        helper="Development and local smoke-test only. Hidden when the backend reports production capabilities."
                      />
                      {advanced.allow_dev_static_otp ? (
                        <Field
                          label="Development static OTP code"
                          name="advanced_dev_static_otp_code"
                          value={advanced.dev_static_otp_code}
                          onChange={(event) =>
                            updateAdvanced("dev_static_otp_code", event.target.value)
                          }
                          helper="Six digit code used only when static OTP is enabled."
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <Alert tone="info">
                    Submit without suggestions to use backend defaults, or load suggestions to
                    review and override the exact domain, database, and auth config applied before
                    the job is queued.
                  </Alert>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                loading={loading}
                icon={<ClipboardCheck aria-hidden className="h-4 w-4" />}
              >
                Queue provisioning
              </Button>
              <p className="text-sm text-muted">
                After submission, open the job detail and verify the operational summary live
                criteria.
              </p>
            </div>
          </form>
        </Panel>
      ) : null}

      {receipt ? (
        <Panel
          title="Queued job"
          description="The backend has accepted the request with HTTP 202. Continue in job monitoring or start a fresh provisioning request."
          actions={
            <>
              <Button
                type="button"
                variant="secondary"
                icon={<Plus aria-hidden className="h-4 w-4" />}
                onClick={startAnotherProvisioningRequest}
              >
                Provision another
              </Button>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand shadow-control transition hover:bg-brand-strong"
                href={`/jobs/${receipt.job_id}`}
              >
                Open job detail
              </Link>
            </>
          }
        >
          <KeyValue
            items={[
              { label: "Job ID", value: receipt.job_id },
              { label: "Tenant ID", value: receipt.tenant_id },
              { label: "Slug", value: receipt.slug },
              { label: "Public host", value: receipt.public_host },
              { label: "Admin host", value: receipt.admin_host },
              { label: "Job status", value: receipt.job_status }
            ]}
          />
        </Panel>
      ) : null}
    </div>
  );
}
