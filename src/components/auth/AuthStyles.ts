/**
 * Shared class strings for the sign-up and login pages. Kept here (rather than
 * in index.css) so the two pages stay visually identical without adding any
 * global classes that other pages could pick up by accident.
 */
export const authLabel = "mb-1.5 block text-[13px] font-medium text-ink-700";

// 16px on phones stops iOS Safari zooming the page on focus; 14px from sm up.
const authInputBase =
  "h-11 rounded-lg border border-surface-border bg-white px-3 text-base text-ink-900 " +
  "placeholder:text-ink-400 transition-colors hover:border-ink-300 sm:h-10 sm:text-sm " +
  "focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const authInput = `w-full ${authInputBase}`;

/** Same field without a width, for inputs that sit beside another control. */
export { authInputBase };

export const authPrimaryButton =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white " +
  "transition-colors hover:bg-brand-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10";

export const authSecondaryButton =
  "inline-flex h-11 w-full items-center justify-center rounded-lg border border-surface-border bg-white px-4 text-sm font-semibold text-ink-900 " +
  "transition-colors hover:border-ink-300 hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10";

export const authLink =
  "rounded font-semibold text-brand-blue hover:text-brand-blue-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40";

export const authError =
  "rounded-lg bg-brand-red-soft px-3 py-2 text-[13px] font-medium leading-snug text-brand-red-ink";

export const authNotice =
  "rounded-lg bg-brand-blue-pale px-3 py-2 text-[13px] font-medium leading-snug text-brand-blue-dark";
