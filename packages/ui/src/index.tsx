import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
};

export function Button({
  variant = "primary",
  busy = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? "Working…" : children}
    </button>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="ui-field">
      <span className="ui-label">{label}</span>
      {children}
      {error ? (
        <span className="ui-field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="ui-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-input ui-select ${className}`.trim()} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} {...props} />;
}

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <span className="ui-empty-mark" aria-hidden="true">
        —
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Table({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="ui-table-scroll">
      <table className="ui-table" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="ui-loading" role="status">
      <span className="ui-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
