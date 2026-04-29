import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

type BaseProps = {
  label: string;
  name: string;
  helper?: ReactNode;
  error?: string;
};

export function Field({
  label,
  name,
  helper,
  error,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const helperId = `${name}-helper`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="input mt-1"
        aria-describedby={`${helper ? helperId : ""} ${error ? errorId : ""}`.trim() || undefined}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {helper ? (
        <p id={helperId} className="helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  helper,
  error,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const helperId = `${name}-helper`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        className="input mt-1 min-h-28 font-mono"
        aria-describedby={`${helper ? helperId : ""} ${error ? errorId : ""}`.trim() || undefined}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {helper ? (
        <p id={helperId} className="helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  helper,
  error,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const helperId = `${name}-helper`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="input mt-1"
        aria-describedby={`${helper ? helperId : ""} ${error ? errorId : ""}`.trim() || undefined}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {helper ? (
        <p id={helperId} className="helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  helper,
  checked,
  onChange
}: {
  label: string;
  name: string;
  helper?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-surface-muted p-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-brand"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div>
        <label htmlFor={name} className="label">
          {label}
        </label>
        {helper ? <p className="helper">{helper}</p> : null}
      </div>
    </div>
  );
}
