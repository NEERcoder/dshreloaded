import type { ProfileRecord } from "./dataAccess";

/**
 * The one profile-completion rule.
 *
 * It counts only columns `public.profiles` actually has, so a percentage can
 * never be raised by something the student has no way to type. MARK records,
 * connections and teams are deliberately absent: those are achievements, not
 * missing profile fields, and counting them would let a bare name read as a
 * finished profile.
 *
 * MARK's own page and CIRCLE's presence card both read this, so the two can
 * never disagree about how much of a profile is left.
 */

/** A college row is resolved by the caller; `collegeKnown` is that answer. */
type FieldRule = (profile: ProfileRecord, collegeKnown: boolean) => boolean;

export const PROFILE_COMPLETION_FIELDS: { key: string; label: string; isFilled: FieldRule }[] = [
  { key: "fullName", label: "Name", isFilled: (profile) => Boolean(profile.fullName.trim()) },
  { key: "college", label: "College", isFilled: (_profile, collegeKnown) => collegeKnown },
  { key: "course", label: "Course", isFilled: (profile) => Boolean(profile.course.trim()) },
  { key: "yearOfStudy", label: "Year of study", isFilled: (profile) => profile.yearOfStudy > 0 },
  { key: "graduationYear", label: "Graduation year", isFilled: (profile) => profile.graduationYear > 0 },
];

export const PROFILE_COMPLETION_TOTAL = PROFILE_COMPLETION_FIELDS.length;

export type ProfileCompletion = {
  filled: number;
  total: number;
  /** 0–100, rounded. A fifth of a field is not a thing a student can fill. */
  percent: number;
  missing: string[];
};

export function profileCompletion(
  profile: ProfileRecord | null,
  collegeKnown: boolean
): ProfileCompletion {
  if (!profile) {
    return {
      filled: 0,
      total: PROFILE_COMPLETION_TOTAL,
      percent: 0,
      missing: PROFILE_COMPLETION_FIELDS.map((field) => field.label),
    };
  }
  const missing: string[] = [];
  let filled = 0;
  for (const field of PROFILE_COMPLETION_FIELDS) {
    if (field.isFilled(profile, collegeKnown)) filled += 1;
    else missing.push(field.label);
  }
  return {
    filled,
    total: PROFILE_COMPLETION_TOTAL,
    percent: Math.round((filled / PROFILE_COMPLETION_TOTAL) * 100),
    missing,
  };
}
