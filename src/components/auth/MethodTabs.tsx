import Icon from "../Icon";
import type { AuthMethod } from "../../lib/auth";

type MethodTabsProps = {
  value: AuthMethod;
  onChange: (method: AuthMethod) => void;
  disabled?: boolean;
};

/**
 * Segmented control that switches an auth form between the email and phone
 * sign-in paths.
 */
export default function MethodTabs({ value, onChange, disabled }: MethodTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-surface-border bg-surface-soft p-1"
    >
      {(["email", "phone"] as const).map((method) => (
        <button
          key={method}
          type="button"
          role="tab"
          aria-selected={value === method}
          disabled={disabled}
          onClick={() => onChange(method)}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value === method
              ? "bg-white text-brand-blue shadow-soft"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          <Icon name={method === "email" ? "mail" : "phone"} className="h-4 w-4" />
          {method === "email" ? "Email" : "Phone"}
        </button>
      ))}
    </div>
  );
}