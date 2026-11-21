import { useState, type ReactNode } from "react";

type PasswordFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  action?: ReactNode;
};

/**
 * Password input with a show/hide toggle. Styled with the shared
 * `field-label` / `field-input` classes so it matches every other form on
 * the site.
 */
export default function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  disabled,
  autoComplete = "current-password",
  placeholder = "••••••••",
  required,
  helperText,
  action,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="meta">{helperText ?? ""}</p>
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-xs font-bold text-ink-500 hover:text-brand-blue disabled:opacity-60"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
