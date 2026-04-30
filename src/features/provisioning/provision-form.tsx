"use client";

import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { KeyValue } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ProvisionRestaurantJobReceipt, ProvisionRestaurantRequest } from "@/lib/api/types";
import { provisionRestaurantSchema } from "@/lib/validation/platform";

type ProvisionFormField = Exclude<keyof ProvisionRestaurantRequest, "tenant_id">;
type FormState = Record<ProvisionFormField, string>;

const initialState: FormState = {
  external_code: "",
  slug: "",
  legal_name: "",
  display_name: "",
  owner_full_name: "",
  owner_phone_number: "",
  owner_email: "",
  schema_version: "restaurant_template/0001_init.sql"
};

function issueMap(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0]), issue.message])
  ) as Partial<Record<keyof ProvisionRestaurantRequest, string>>;
}

export function ProvisionForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProvisionRestaurantRequest, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ProvisionRestaurantJobReceipt | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: keyof FormState, value: string) {
    const normalized =
      name === "external_code"
        ? value.toUpperCase()
        : name === "slug" || name === "owner_email"
          ? value.toLowerCase()
          : value;
    setForm((current) => ({ ...current, [name]: normalized }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setReceipt(null);

    const parsed = provisionRestaurantSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(issueMap(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const response = await platformApi<ProvisionRestaurantJobReceipt>("/restaurants/provision", {
        method: "POST",
        body: parsed.data
      });
      setReceipt(response);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant onboarding"
        title="Provision restaurant"
        description="Queue the current backend create-and-provision workflow. The response is asynchronous: use the returned job ID to monitor step progress, audit, and final runtime receipt."
      />

      {receipt ? (
        <Alert tone="success" title="Provisioning queued" live>
          The backend accepted the request. Open the job detail to follow the workflow.
        </Alert>
      ) : null}
      {submitError ? (
        <Alert tone="danger" title="Provisioning request failed" live>
          {submitError}
        </Alert>
      ) : null}

      <Panel
        title="Restaurant identity"
        description="These values create the control-plane restaurant record and platform-managed hosts. The backend generates the restaurant UUID automatically."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
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
              maxLength={50}
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              loading={loading}
              icon={<ClipboardCheck aria-hidden className="h-4 w-4" />}
            >
              Queue provisioning
            </Button>
            <p className="text-sm text-muted">
              After submission, the dashboard will use the job record as the tenant index until
              restaurant list/search exists.
            </p>
          </div>
        </form>
      </Panel>

      {receipt ? (
        <Panel
          title="Queued job"
          description="The backend has accepted the request with HTTP 202. Continue in job monitoring."
          actions={
            <Link
              className="text-sm font-medium text-brand hover:underline"
              href={`/jobs/${receipt.job_id}`}
            >
              Open job detail
            </Link>
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
