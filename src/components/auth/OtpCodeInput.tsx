type OtpCodeInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
  helperText?: string;
};

/**
 * A single-digit-group code input for SMS one-time passwords. Digits are
 * enforced client-side (non-digits are stripped) so a pasted "+91…98765"
 * style string can never reach the verify call.
 */
export default function OtpCodeInput({
  id,
  label = "Verification code",
  value,
  onChange,
  disabled,
  autoFocus,
  length = 6,
  helperText,
}: OtpCodeInputProps) {
  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, length);
    onChange(digits);
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={"•".repeat(length)}
        className="field-input mt-0 text-center text-lg font-bold tracking-[0.5em] placeholder:tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {helperText ? <p className="mt-1 meta">{helperText}</p> : null}
    </div>
  );
}
