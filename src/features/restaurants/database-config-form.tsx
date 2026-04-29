"use client";

import { Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { RestaurantDatabaseConfig, RestaurantDatabaseConfigRequest } from "@/lib/api/types";
import { databaseConfigSchema, parseJsonObject } from "@/lib/validation/platform";

export function DatabaseConfigForm({
  restaurantId,
  config,
  onSaved
}: {
  restaurantId: string;
  config?: RestaurantDatabaseConfig | null;
  onSaved: () => Promise<void> | void;
}) {
  const initial = useMemo(
    () => ({
      db_name: config?.db_name ?? "tenant_smoke_provisioned",
      db_host: config?.db_host ?? "127.0.0.1",
      db_port: String(config?.db_port ?? 16432),
      db_user_secret_ref: config?.db_user_secret_ref ?? "secret://smoke-provisioned-db-user",
      db_password_secret_ref: config?.db_password_secret_ref ?? "secret://smoke-provisioned-db-password",
      schema_version: config?.schema_version ?? "restaurant_template/0001_init.sql",
      connection_options: JSON.stringify(config?.connection_options ?? { pool_mode: "transaction" }, null, 2)
    }),
    [config]
  );
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
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
      const parsed = databaseConfigSchema.parse(payload);
      await platformApi<RestaurantDatabaseConfig>(`/restaurants/${restaurantId}/database-config`, {
        method: "PUT",
        body: parsed
      });
      setMessage("Database config saved. Backend marks it pending until infra prepare verifies it.");
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
        <Field label="Database name" name="db_name" value={form.db_name} onChange={(event) => update("db_name", event.target.value)} helper="PostgreSQL-safe tenant database name. Example: tenant_smoke_provisioned." required />
        <Field label="Database host" name="db_host" value={form.db_host} onChange={(event) => update("db_host", event.target.value)} helper="Runtime database host or PgBouncer target. Example: 127.0.0.1." required />
        <Field label="Database port" name="db_port" type="number" value={form.db_port} onChange={(event) => update("db_port", event.target.value)} helper="TCP port between 1 and 65535. Local PgBouncer example: 16432." required />
        <Field label="Schema version" name="db_schema_version" value={form.schema_version} onChange={(event) => update("schema_version", event.target.value)} helper="Tenant schema applied during provisioning. Example: restaurant_template/0001_init.sql." />
        <Field label="DB user secret ref" name="db_user_secret_ref" value={form.db_user_secret_ref} onChange={(event) => update("db_user_secret_ref", event.target.value)} helper="Secret reference only; resolved values are never returned. Example: secret://smoke-provisioned-db-user." required />
        <Field label="DB password secret ref" name="db_password_secret_ref" value={form.db_password_secret_ref} onChange={(event) => update("db_password_secret_ref", event.target.value)} helper="Secret reference only. Example: secret://smoke-provisioned-db-password." required />
      </div>
      <TextAreaField
        label="Connection options"
        name="connection_options"
        value={form.connection_options}
        onChange={(event) => update("connection_options", event.target.value)}
        helper='JSON object forwarded to the backend. Example: { "pool_mode": "transaction" }.'
      />
      <Button type="submit" loading={loading} icon={<Save aria-hidden className="h-4 w-4" />}>
        Save database config
      </Button>
    </form>
  );
}
