import Icon from "../Icon";
import type { RewardTone } from "../../lib/prize";

/**
 * What a listing gives you, and what it looks like.
 *
 * A cash prize, a box of merchandise and a stipend are three different
 * promises, and until now every one of them rendered in the same grey chip as
 * "Mode: Remote" — so the number a student is actually comparing had the least
 * weight on the card. The tone comes from `lib/prize`, never from a caller, so
 * the feed, the detail page and the homepage cannot disagree about the same
 * listing.
 *
 * Colours are tokens that `.section-navy` re-points, which is why there is no
 * utility remap here and why the pill survives on the dark section pages. The
 * off-system `bg-emerald-50` it replaces never flipped, so a prize pill sat
 * light-green-on-white inside a navy page.
 *
 * One rule per surface: a money fact appears once. The detail page already
 * lists the stipend in its fact grid, so it gets no second pay pill here.
 */

const TONE_CLASS: Record<RewardTone, string> = {
  cash: "reward-pill--cash",
  goods: "reward-pill--goods",
  pay: "reward-pill--pay",
  free: "reward-pill--free",
  neutral: "reward-pill--neutral",
};

/**
 * `pay` and `neutral` share the wallet on purpose: it is the same column either
 * way, and the colour is what says whether the wording looked like money. A
 * "no entry" glyph would read as a missing value rather than an unpaid one.
 */
const TONE_ICON: Record<RewardTone, string> = {
  cash: "trophy",
  goods: "award",
  pay: "wallet",
  free: "check-circle",
  neutral: "wallet",
};

export default function RewardPill({
  tone,
  value,
  as = "span",
  className = "",
}: {
  tone: RewardTone;
  value: string;
  /** `li` inside a feed's fact list; `span` anywhere else. */
  as?: "span" | "li";
  className?: string;
}) {
  const classes = `reward-pill ${TONE_CLASS[tone]} ${className}`;
  const glyph = <Icon name={TONE_ICON[tone]} className="h-3.5 w-3.5" />;
  const text = <span className="min-w-0 truncate">{value}</span>;

  return as === "li" ? (
    <li className={classes}>{glyph}{text}</li>
  ) : (
    <span className={classes}>{glyph}{text}</span>
  );
}
