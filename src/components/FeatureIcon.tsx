import Icon from "./Icon";
import { opportunityCategoryIcon } from "../data/opportunityCategories";

/**
 * The supplied JAVLIN feature artwork, in one place so a path is never repeated
 * across components. Every asset is a full-colour transparent PNG in two sizes:
 * `compact` (128px source) for nav rows, chips and badges, `large` (512px source)
 * for page headers and poster-scale presentations. Displayed size is always set
 * by the caller's `className` — the native resolution is never used as the box.
 *
 * `business` and `events` exist in the asset set but map to no feature in this
 * app yet, so they are deliberately absent here and stay unused.
 */
export type FeatureIconName =
  | "internship"
  | "competition"
  | "certification"
  | "college"
  | "profile"
  | "dashboard"
  | "notification";

const FEATURE_ICON: Record<FeatureIconName, { compact: string; large: string }> = {
  internship: { compact: "/icons/internship_128.png", large: "/icons/internship.png" },
  competition: { compact: "/icons/competition_128.png", large: "/icons/competition.png" },
  certification: { compact: "/icons/certification_128.png", large: "/icons/certification.png" },
  college: { compact: "/icons/college_128.png", large: "/icons/college.png" },
  profile: { compact: "/icons/profile_128.png", large: "/icons/profile.png" },
  dashboard: { compact: "/icons/dashboard_128.png", large: "/icons/dashboard.png" },
  notification: { compact: "/icons/notification_128.png", large: "/icons/notification.png" },
};

type FeatureIconProps = {
  name: FeatureIconName;
  /** `compact` for ≤24px slots, `large` for headers and empty-state wells. */
  size?: "compact" | "large";
  /** Box the artwork into — `object-contain` keeps the aspect ratio. */
  className?: string;
  /** Leave unset for decorative icons; the adjacent label carries the meaning. */
  alt?: string;
};

export default function FeatureIcon({ name, size = "compact", className = "", alt }: FeatureIconProps) {
  const px = size === "large" ? 512 : 128;
  return (
    <img
      src={FEATURE_ICON[name][size]}
      alt={alt ?? ""}
      {...(alt ? {} : { "aria-hidden": true as const })}
      width={px}
      height={px}
      draggable={false}
      decoding="async"
      loading={size === "large" ? "lazy" : undefined}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}

/**
 * Listing categories that have supplied artwork. The rest (job, research,
 * fellowship, scholarship) keep their existing stroke glyphs, because an
 * unrelated picture would be worse than the glyph they already carry.
 */
const CATEGORY_FEATURE: Record<string, FeatureIconName> = {
  internship: "internship",
  competition: "competition",
  certification: "certification",
};

/**
 * The glyph for an opportunity's category — supplied artwork where it exists,
 * otherwise the `opportunityCategoryIcon` fallback. Used by every card, badge
 * and poster so the mapping stays in one place.
 */
export function CategoryGlyph({
  category,
  size = "compact",
  className = "h-3.5 w-3.5",
}: {
  category: string;
  size?: "compact" | "large";
  className?: string;
}) {
  const feature = CATEGORY_FEATURE[category];
  if (feature) return <FeatureIcon name={feature} size={size} className={className} />;
  return <Icon name={opportunityCategoryIcon(category)} className={className} />;
}
