export type CategoryId = "aim" | "field" | "crew" | "circle" | "mark" | "pulse";

export type JavlinCategory = {
  id: CategoryId;
  label: string;
  /** Existing route — the selector links to the pages, it never duplicates them. */
  href: string;
  iconSrc: string;
  /**
   * The launcher's headline for the area — the one promise line that sits above
   * the description. Kept here so the desktop grid and the mobile 3x2 launcher
   * always show the same words.
   */
  title: string;
  /**
   * What the area actually holds. This one string feeds the desktop launcher,
   * the mobile 3x2 launcher and every aria-label, so the wording can never
   * drift between the two layouts.
   */
  description: string;
};

export const JAVLIN_CATEGORIES: JavlinCategory[] = [
  {
    id: "aim",
    label: "AIM",
    href: "/aim",
    iconSrc: "/categories/aim.png",
    title: "Find your next opportunity.",
    description: "Internships, jobs and certifications to move you forward.",
  },
  {
    id: "field",
    label: "FIELD",
    href: "/field",
    iconSrc: "/categories/field.png",
    title: "Step up. Compete. Stand out.",
    description: "Discover competitions, hackathons and challenges worth taking on.",
  },
  {
    id: "crew",
    label: "CREW",
    href: "/crew",
    iconSrc: "/categories/crew.png",
    title: "Great things take a team.",
    description: "Find teammates, build your crew and take on challenges together.",
  },
  {
    id: "circle",
    label: "CIRCLE",
    href: "/circle",
    iconSrc: "/categories/circle.png",
    title: "Your people are out there.",
    description: "Discover students across colleges, courses and shared interests.",
  },
  {
    id: "mark",
    label: "MARK",
    href: "/mark",
    iconSrc: "/categories/mark.png",
    title: "Make your college years count.",
    description: "Build your record of competitions, projects, certifications and achievements.",
  },
  {
    id: "pulse",
    label: "PULSE",
    href: "/pulse",
    iconSrc: "/categories/pulse.png",
    title: "Stay in the loop.",
    description: "Campus updates, student stories and opportunities worth knowing about.",
  },
];

const BY_ID = new Map(JAVLIN_CATEGORIES.map((category) => [category.id, category]));

export function categoryById(id: CategoryId): JavlinCategory | undefined {
  return BY_ID.get(id);
}
