"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

export type OperatorAction = "retry" | "cancel" | "requeue" | "force-fail";

const actionCopy: Record<
  OperatorAction,
  {
    title: string;
    description: string;
    needsReason: boolean;
    variant: "primary" | "danger" | "secondary";
  }
> = {
  retry: {
    title: "Retry failed job",
    description:
      "Creates a fresh queued job from a failed source job. The failed source job remains unchanged for audit.",
    needsReason: false,
    variant: "primary"
  },
  cancel: {
    title: "Cancel job",
    description:
      "Cancels a queued or running job in place. Use this when an operator deliberately wants the current attempt to stop.",
    needsReason: true,
    variant: "danger"
  },
  requeue: {
    title: "Requeue job",
    description:
      "Moves a failed, cancelled, queued, or expired running job back to queued. Active running leases are rejected by the backend.",
    needsReason: true,
    variant: "secondary"
  },
  "force-fail": {
    title: "Force fail job",
    description:
      "Marks a queued or running job failed in place. Use only when the current attempt cannot continue safely.",
    needsReason: true,
    variant: "danger"
  }
};

export function OperatorActionDialog({
  jobId,
  action,
  onDone
}: {
  jobId: string;
  action: OperatorAction;
  onDone: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = actionCopy[action];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await platformApi(`/restaurants/provisioning-jobs/${jobId}/${action}`, {
        method: "POST",
        body: copy.needsReason ? { reason: reason.trim() || undefined } : undefined
      });
      setOpen(false);
      setReason("");
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant={copy.variant} onClick={() => setOpen(true)}>
        {copy.title}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <form
            className="panel flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden"
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
            <div className="space-y-4 overflow-y-auto p-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {copy.needsReason ? (
                <TextAreaField
                  label="Operator reason"
                  name={`${action}_reason`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  helper="Optional but recommended. This reason is sent to the backend audit trail. Example: Requeue after expired worker lease."
                />
              ) : (
                <Alert tone="info">
                  Retry does not accept a reason in the current backend contract. The new job will
                  be linked to the failed source through backend audit history.
                </Alert>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-surface-raised p-4">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" variant={copy.variant} loading={loading}>
                Confirm {copy.title.toLowerCase()}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
