"use client";

import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";

export type AdvancedRepairChange = {
  label: string;
  before: string;
  after: string;
};

export function AdvancedRepairConfirmation({
  title,
  changes,
  confirmationValue,
  value,
  onChange
}: {
  title: string;
  changes: AdvancedRepairChange[];
  confirmationValue: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (changes.length === 0) return null;

  const matches = value.trim() === confirmationValue;

  return (
    <div className="space-y-3 rounded-lg border border-warning-line bg-warning-soft p-3 text-warning">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6">
            These changes can disrupt a running restaurant. Review the changed runtime values and
            type the confirmation value before saving.
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded border border-warning-line bg-surface text-ink">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Field</th>
              <th className="px-3 py-2 font-semibold">Current</th>
              <th className="px-3 py-2 font-semibold">New</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.label} className="border-t border-line">
                <td className="px-3 py-2 font-semibold">{change.label}</td>
                <td className="break-all px-3 py-2 font-mono">{change.before}</td>
                <td className="break-all px-3 py-2 font-mono">{change.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Alert tone="warning">
        Type <span className="font-mono">{confirmationValue}</span> to confirm.
      </Alert>
      <Field
        label="Advanced repair confirmation"
        name={`advanced_repair_confirmation_${title.toLowerCase().replaceAll(" ", "_")}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        helper="Required only for risky advanced repair changes."
        error={value.length > 0 && !matches ? "Confirmation value must match exactly." : undefined}
        required
      />
    </div>
  );
}
