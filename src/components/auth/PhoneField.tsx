import { COUNTRY_CODES } from "../../lib/auth";

type PhoneFieldProps = {
  id: string;
  label?: string;
  dialCode: string;
  onDialCodeChange: (code: string) => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  helperText?: string;
};

/**
 * Phone number input with a country dial-code selector. The dial code is
 * kept separate from the national number so the two can be recombined into
 * E.164 form (`buildE164Phone`) at submit time.
 */
export default function PhoneField({
  id,
  label = "Phone number",
  dialCode,
  onDialCodeChange,
  value,
  onChange,
  disabled,
  autoFocus,
  helperText,
}: PhoneFieldProps) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <select
          aria-label="Country calling code"
          value={dialCode}
          onChange={(event) => onDialCodeChange(event.target.value)}
          disabled={disabled}
          className="field-input mt-0 w-auto shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {COUNTRY_CODES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.code} {country.short}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder="98765 43210"
          className="field-input mt-0 min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {helperText ? <p className="mt-1 meta">{helperText}</p> : null}
    </div>
  );
}
