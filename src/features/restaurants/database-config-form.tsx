"use client";

import { Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { RestaurantDatabaseConfig, RestaurantDatabaseConfigRequest } from "@/lib/api/types";
import {
  databaseConfigSchema,
  formatValidationIssue,
  parseJsonObject
} from "@/lib/validation/platform";
import {
  AdvancedRepairConfirmation,
  type AdvancedRepairChange
} from "./advanced-repair-confirmation";
import { pollProvisioningJobUntilTerminal, queueInfraPrepare } from "./infra-prepare";

export function DatabaseConfigForm({
  restaurantId,
  restaurantSlug,
  config,
  onSaved,
  queuePrepareAfterSave = false
}: {
  restaurantId: string;
  restaurantSlug?: string;
  config?: RestaurantDatabaseConfig | null;
  onSaved: () => Promise<void> | void;
  queuePrepareAfterSave?: boolean;
}) {
  const initial = useMemo(
    () => ({
      db_name: config?.db_name ?? "tenant_smoke_provisioned",
      db_host: config?.db_host ?? "127.0.0.1",
      db_port: String(config?.db_port ?? 16432),
      db_user_secret_ref: config?.db_user_secret_ref ?? "secret://smoke-provisioned-db-user",
      db_password_secret_ref:
        config?.db_password_secret_ref ?? "secret://smoke-provisioned-db-password",
      schema_version: config?.schema_version ?? "restaurant_template/0001_init.sql",
      connection_options: JSON.stringify(
        config?.connection_options ?? { pool_mode: "transaction" },
        null,
        2
      )
    }),
    [config]
  );
  const [form, setForm] = useState(initial);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validationLabels = {
    db_name: "Database name",
    db_host: "Database host",
    db_port: "Database port",
    db_user_secret_ref: "DB user secret ref",
    db_password_secret_ref: "DB password secret ref",
    schema_version: "Schema version"
  };

  useEffect(() => {
    setForm(initial);
    setConfirmation("");
  }, [initial]);

  const riskyChanges = useMemo<AdvancedRepairChange[]>(() => {
    if (!config) return [];
    const compare = [
      ["Database name", config.db_name, form.db_name],
      ["Database host", config.db_host, form.db_host],
      ["Database port", String(config.db_port), form.db_port],
      ["DB user secret ref", config.db_user_secret_ref, form.db_user_secret_ref],
      ["DB password secret ref", config.db_password_secret_ref, form.db_password_secret_ref]
    ] satisfies [string, string, string][];

    return compare
      .filter(([, before, after]) => before.trim() !== after.trim())
      .map(([label, before, after]) => ({
        label,
        before: before || "(empty)",
        after: after || "(empty)"
      }));
  }, [config, form]);

  const databaseNameChanged = config ? config.db_name.trim() !== form.db_name.trim() : false;
  const confirmationValue = databaseNameChanged
    ? form.db_name.trim()
    : (restaurantSlug ?? config?.db_name ?? restaurantId);

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (riskyChanges.length > 0 && confirmation.trim() !== confirmationValue) {
      setMessage(`Type ${confirmationValue} to confirm advanced database repair.`);
      return;
    }
    try {
      const payload: RestaurantDatabaseConfigRequest = {
        db_name: form.db_name,
        db_host: form.db_host,
        db_port: Number(form.db_port),
        db_user_secret_ref: form.db_user_secret_ref,
        db_password_secret_ref: form.db_password_secret_ref,
        schema_version: form.schema_version || undefined,
        connection_options: parseJsonObject(form.connection_options)
      };
      const parsed = databaseConfigSchema.safeParse(payload);
      if (!parsed.success) {
        setMessage(formatValidationIssue(parsed.error, validationLabels));
        return;
      }
      setLoading(true);
      await platformApi<RestaurantDatabaseConfig>(`/restaurants/${restaurantId}/database-config`, {
        method: "PUT",
        body: parsed.data
      });
      let nextMessage =
        "Database config saved. Backend marks it pending until infra prepare verifies it.";
      if (queuePrepareAfterSave) {
        const receipt = await queueInfraPrepare(restaurantId);
        nextMessage = `${nextMessage} Infra prepare queued as job ${receipt.job_id}.`;
        void pollProvisioningJobUntilTerminal(
          receipt.job_id,
          (status) =>
            setMessage(
              `Database config saved. Infra prepare job ${status.job_id} finished with ${status.job_status}.`
            ),
          (pollError) => setMessage(pollError)
        );
      }
      setMessage(nextMessage);
      await onSaved();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {queuePrepareAfterSave ? (
        <Alert tone="warning" title="Advanced database repair can disrupt a running restaurant">
          DB target changes require infra prepare and may point this restaurant at a different
          database. Changing a database name does not rename or migrate existing data.
        </Alert>
      ) : null}
      {message ? (
        <Alert tone={message.includes("saved") ? "success" : "danger"} live>
          {message}
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Database name"
          name="db_name"
          value={form.db_name}
          onChange={(event) => update("db_name", event.target.value)}
          helper="Changing this does not rename or migrate data. Use lowercase letters, numbers, and underscores only; max 48 characters."
          required
        />
        <Field
          label="Database host"
          name="db_host"
          value={form.db_host}
          onChange={(event) => update("db_host", event.target.value)}
          helper="Runtime database host or PgBouncer target. Wrong values can break runtime DB access. Example: 127.0.0.1."
          required
        />
        <Field
          label="Database port"
          name="db_port"
          type="number"
          value={form.db_port}
          onChange={(event) => update("db_port", event.target.value)}
          helper="TCP port between 1 and 65535. Wrong values can break runtime DB access. Local PgBouncer example: 16432."
          required
        />
        <Field
          label="Schema version"
          name="db_schema_version"
          value={form.schema_version}
          onChange={(event) => update("schema_version", event.target.value)}
          helper="Tenant schema applied during provisioning. Example: restaurant_template/0001_init.sql."
        />
        <Field
          label="DB user secret ref"
          name="db_user_secret_ref"
          value={form.db_user_secret_ref}
          onChange={(event) => update("db_user_secret_ref", event.target.value)}
          helper="Secret reference only; wrong values can break runtime DB access. Resolved values are never returned."
          required
        />
        <Field
          label="DB password secret ref"
          name="db_password_secret_ref"
          value={form.db_password_secret_ref}
          onChange={(event) => update("db_password_secret_ref", event.target.value)}
          helper="Secret reference only; wrong values can break runtime DB access. Example: secret://smoke-provisioned-db-password."
          required
        />
      </div>
      <TextAreaField
        label="Connection options"
        name="connection_options"
        value={form.connection_options}
        onChange={(event) => update("connection_options", event.target.value)}
        helper='JSON object forwarded to the backend. Example: { "pool_mode": "transaction" }.'
      />
      <AdvancedRepairConfirmation
        title="Confirm database repair"
        changes={riskyChanges}
        confirmationValue={confirmationValue}
        value={confirmation}
        onChange={setConfirmation}
      />
      <Button type="submit" loading={loading} icon={<Save aria-hidden className="h-4 w-4" />}>
        Save database config
      </Button>
    </form>
  );
}
