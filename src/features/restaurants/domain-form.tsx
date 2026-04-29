"use client";

import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, SelectField } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { RestaurantDomain, RestaurantDomainRequest } from "@/lib/api/types";
import { restaurantDomainSchema } from "@/lib/validation/platform";

export function DomainForm({
  restaurantId,
  onSaved
}: {
  restaurantId: string;
  onSaved: () => Promise<void> | void;
}) {
  const [host, setHost] = useState("");
  const [domainType, setDomainType] = useState<"subdomain" | "custom">("custom");
  const [isPrimary, setIsPrimary] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFieldError(null);

    const payload: RestaurantDomainRequest = {
      host,
      domain_type: domainType,
      is_primary: isPrimary
    };
    const parsed = restaurantDomainSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Check the domain fields.");
      return;
    }

    setLoading(true);
    try {
      await platformApi<RestaurantDomain>(`/restaurants/${restaurantId}/domains`, {
        method: "POST",
        body: parsed.data
      });
      setHost("");
      setIsPrimary(false);
      setMessage("Domain binding created. Refreshing summary.");
      await onSaved();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      {message ? (
        <Alert tone={message.includes("created") ? "success" : "danger"} live>
          {message}
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <Field
          label="Host"
          name="domain_host"
          value={host}
          onChange={(event) => setHost(event.target.value)}
          helper="Use the exact lowercase host to route. Example: smoke-provisioned-custom.guestlantern.localhost."
          error={fieldError ?? undefined}
          required
        />
        <SelectField
          label="Domain type"
          name="domain_type"
          value={domainType}
          onChange={(event) => setDomainType(event.target.value as "subdomain" | "custom")}
          helper="Current backend accepts subdomain or custom."
        >
          <option value="custom">Custom</option>
          <option value="subdomain">Subdomain</option>
        </SelectField>
      </div>
      <CheckboxField
        label="Promote as primary"
        name="domain_primary"
        checked={isPrimary}
        onChange={setIsPrimary}
        helper="When enabled, the backend can promote this active domain as the primary host for the restaurant."
      />
      <Button type="submit" loading={loading} icon={<Plus aria-hidden className="h-4 w-4" />}>
        Create domain
      </Button>
    </form>
  );
}
