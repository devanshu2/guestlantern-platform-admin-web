"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, DatabaseBackup, Power, PowerOff, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage, isStepUpRequired } from "@/lib/api/errors";
import type {
  PlatformAdminStepUpGrant,
  PlatformStepUpRequest,
  TenantInfraOperationRequest,
  TenantOpsReceipt
} from "@/lib/api/types";

export type TenantInfraLifecycleAction =
  | "database-backup"
  | "disable"
  | "re-enable"
  | "permanent-delete";

type ActionCopy = {
  title: string;
  description: string;
  scope: string;
  endpoint: string;
  variant: "primary" | "secondary" | "danger";
  requiresReason: boolean;
  requiresConfirmId: boolean;
  requiresConfirmSlug: boolean;
  icon: React.ReactNode;
};

const actionCopy: Record<TenantInfraLifecycleAction, ActionCopy> = {
  "database-backup": {
    title: "Database Backup",
    description:
      "Creates a tenant Postgres database snapshot. Media/object backup and restore are separate future operations.",
    scope: "tenant_infra.database_backup",
    endpoint: "database-backup",
    variant: "primary",
    requiresReason: false,
    requiresConfirmId: false,
    requiresConfirmSlug: false,
    icon: <DatabaseBackup aria-hidden className="h-4 w-4" />
  },
  disable: {
    title: "Disable",
    description:
      "Queues runtime detach for this tenant while keeping the live tenant database and recorded metadata.",
    scope: "tenant_infra.disable",
    endpoint: "disable",
    variant: "danger",
    requiresReason: true,
    requiresConfirmId: true,
    requiresConfirmSlug: false,
    icon: <PowerOff aria-hidden className="h-4 w-4" />
  },
  "re-enable": {
    title: "Re-enable",
    description:
      "Queues runtime reattachment by creating fresh runtime credentials and restoring tenant access.",
    scope: "tenant_infra.re_enable",
    endpoint: "re-enable",
    variant: "secondary",
    requiresReason: true,
    requiresConfirmId: true,
    requiresConfirmSlug: false,
    icon: <Power aria-hidden className="h-4 w-4" />
  },
  "permanent-delete": {
    title: "Permanent delete",
    description:
      "Queues permanent deletion of live tenant runtime resources and control-plane records. This cannot be undone from this UI.",
    scope: "tenant_infra.permanent_delete",
    endpoint: "permanent-delete",
    variant: "danger",
    requiresReason: true,
    requiresConfirmId: true,
    requiresConfirmSlug: true,
    icon: <Trash2 aria-hidden className="h-4 w-4" />
  }
};

function trimmed(value: string) {
  return value.trim();
}

export function TenantInfraLifecycleActionDialog({
  restaurantId,
  slug,
  action,
  disabled,
  disabledReason,
  onQueued
}: {
  restaurantId: string;
  slug: string;
  action: TenantInfraLifecycleAction;
  disabled: boolean;
  disabledReason?: string;
  onQueued: (receipt: TenantOpsReceipt) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmRestaurantId, setConfirmRestaurantId] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = actionCopy[action];

  const reasonOk = !copy.requiresReason || trimmed(reason).length > 0;
  const restaurantIdOk =
    !copy.requiresConfirmId || trimmed(confirmRestaurantId).toLowerCase() === restaurantId;
  const slugOk = !copy.requiresConfirmSlug || trimmed(confirmSlug) === slug;
  const canSubmit = trimmed(password).length > 0 && reasonOk && restaurantIdOk && slugOk;

  function resetForm() {
    setPassword("");
    setReason("");
    setConfirmRestaurantId("");
    setConfirmSlug("");
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    try {
      await platformApi<PlatformAdminStepUpGrant>("/auth/step-up", {
        method: "POST",
        body: {
          password: trimmed(password),
          scope: copy.scope
        } satisfies PlatformStepUpRequest
      });

      const body: TenantInfraOperationRequest = {};
      const operatorReason = trimmed(reason);
      if (operatorReason) body.reason = operatorReason;
      if (copy.requiresConfirmId) body.confirm_restaurant_id = restaurantId;
      if (copy.requiresConfirmSlug) body.confirm_slug = slug;

      const receipt = await platformApi<TenantOpsReceipt>(
        `/restaurants/${restaurantId}/infra/${copy.endpoint}`,
        {
          method: "POST",
          body
        }
      );
      setOpen(false);
      resetForm();
      await onQueued(receipt);
    } catch (err) {
      if (isStepUpRequired(err)) {
        setPassword("");
        setError("Password step-up is required. Re-enter your password and try again.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={copy.variant}
        icon={copy.icon}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setOpen(true)}
      >
        {copy.title}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm sm:flex sm:items-center sm:justify-center"
          role="presentation"
        >
          <form
            className="panel fixed inset-4 grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:relative sm:inset-auto sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${action}-title`}
            onSubmit={submit}
          >
            <div className="flex shrink-0 gap-3 border-b border-line p-4">
              <AlertTriangle aria-hidden className="mt-1 h-5 w-5 shrink-0 text-warning" />
              <div>
                <h2 id={`${action}-title`} className="text-lg font-semibold text-ink">
                  {copy.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">{copy.description}</p>
              </div>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto p-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}

              <Field
                label="Platform admin password"
                name={`${action}_password`}
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                helper={`Required for ${copy.scope}.`}
              />

              <TextAreaField
                label={copy.requiresReason ? "Operator reason" : "Operator reason"}
                name={`${action}_reason`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                helper={
                  copy.requiresReason
                    ? "Required. This reason is sent to the backend audit trail."
                    : "Optional. This reason is sent to the backend audit trail when provided."
                }
                error={
                  copy.requiresReason && reason.length > 0 && !reasonOk ? "Required" : undefined
                }
              />

              {copy.requiresConfirmId ? (
                <Field
                  label="Confirm restaurant ID"
                  name={`${action}_confirm_restaurant_id`}
                  value={confirmRestaurantId}
                  onChange={(event) => setConfirmRestaurantId(event.target.value)}
                  helper={`Type ${restaurantId} to confirm.`}
                  error={
                    confirmRestaurantId.length > 0 && !restaurantIdOk
                      ? "Restaurant ID must match exactly."
                      : undefined
                  }
                />
              ) : null}

              {copy.requiresConfirmSlug ? (
                <Field
                  label="Confirm slug"
                  name={`${action}_confirm_slug`}
                  value={confirmSlug}
                  onChange={(event) => setConfirmSlug(event.target.value)}
                  helper={`Type ${slug} to confirm.`}
                  error={confirmSlug.length > 0 && !slugOk ? "Slug must match exactly." : undefined}
                />
              ) : null}

              <div className="sticky bottom-0 -mx-4 mt-4 grid gap-2 border-t border-line bg-surface-raised p-4 sm:flex sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant={copy.variant}
                  className="w-full sm:w-auto"
                  loading={loading}
                  disabled={!canSubmit}
                >
                  Confirm {copy.title.toLowerCase()}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
