// Client-side phone validation + normalization kept consistent with the
// database CHECK on the phone column: `^[+]?[0-9]{10,15}$`.
//
// Rules:
//   - Only digits, a single optional leading '+', and the separators
//     space / dash / dot / parentheses are accepted as input.
//   - Separators are stripped for storage; digits are never dropped.
//   - The stored value must contain 10–15 digits (covers national 10-digit
//     numbers and international numbers that include a country code).

export type PhoneResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = (raw ?? "").trim();

  if (!trimmed) {
    return { ok: false, error: "Enter your mobile phone number." };
  }

  // Reject characters outside the allowed set (letters, symbols, etc.).
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Phone number can only contain digits and +, spaces, dashes, dots or parentheses.",
    };
  }

  // At most one leading '+'.
  const plusCount = (trimmed.match(/\+/g) || []).length;
  if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith("+"))) {
    return { ok: false, error: "A '+' is only allowed at the start of the number." };
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return {
      ok: false,
      error: "Enter a valid phone number with 10 to 15 digits (include your country code for international numbers).",
    };
  }

  const normalized = (trimmed.startsWith("+") ? "+" : "") + digits;
  return { ok: true, value: normalized };
}

// Convenience for optional fields (e.g. dashboard where phone may be cleared).
export function normalizeOptionalPhone(raw: string): PhoneResult | { ok: true; value: null } {
  if (!(raw ?? "").trim()) {
    return { ok: true, value: null };
  }
  return normalizePhone(raw);
}