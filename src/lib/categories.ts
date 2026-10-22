export type CategoryId = "aim" | "field" | "crew" | "circle" | "mark" | "pulse";

export type JavlinCategory = {
  id: CategoryId;
  label: string;
  /** Existing route — the selector links to the pages, it never duplicates them. */
  href: string;
  iconSrc: string;
  /**
   * The actions the launcher tile offers, in display order. Every href is an
   * existing route; a tile never invents a destination. AIM splits into its two
   * pillars, every other area has one. Kept here so the six tiles cannot drift.
   * `icon` names an existing 2D glyph from the shared Icon set — the CTA's own
   * mark, never a replacement for the area's supplied feature artwork.
   */
  ctas: { label: string; href: string; icon: string }[];
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
    ctas: [
      { label: "Internships", href: "/opportunities/internships", icon: "briefcase" },
      { label: "Certifications", href: "/opportunities/certifications", icon: "award" },
      { label: "Research", href: "/opportunities/research", icon: "flask" },
    ],
    title: "Find your next opportunity.",
    description: "Internships, Jobs and Certifications.",
  },
  {
    id: "field",
    label: "FIELD",
    href: "/field",
    iconSrc: "/categories/field.png",
    ctas: [
      { label: "Competitions", href: "/opportunities/competitions", icon: "trophy" },
      { label: "Events", href: "/field", icon: "calendar" },
      { label: "Hackathons", href: "/field", icon: "code" },
    ],
    title: "Step up. Compete. Stand out.",
    description: "Competitions, Hackathons and Challenges.",
  },
  {
    id: "crew",
    label: "CREW",
    href: "/crew",
    iconSrc: "/categories/crew.png",
    ctas: [{ label: "Find Teams", href: "/crew", icon: "users" }],
    title: "Great things take a team.",
    description: "Find teammates, build your team.",
  },
  {
    id: "circle",
    label: "CIRCLE",
    href: "/circle",
    iconSrc: "/categories/circle.png",
    ctas: [{ label: "Connect with People with Common Interests", href: "/circle", icon: "handshake" }],
    title: "Your people are out there.",
    description: "Connect with students across colleges, courses and interests.",
  },
  {
    id: "mark",
    label: "MARK",
    href: "/mark",
    iconSrc: "/categories/mark.png",
    ctas: [{ label: "Your Achievements", href: "/mark", icon: "star" }],
    title: "Make your college years count.",
    description: "Add your achievements, projects, certifications and competitions in one profile.",
  },
  {
    id: "pulse",
    label: "PULSE",
    href: "/pulse",
    iconSrc: "/categories/pulse.png",
    ctas: [{ label: "Campus News", href: "/pulse", icon: "newspaper" }],
    title: "Stay in the loop.",
    description: "Student NEWS",
  },
];

const BY_ID = new Map(JAVLIN_CATEGORIES.map((category) => [category.id, category]));

export function categoryById(id: CategoryId): JavlinCategory | undefined {
  return BY_ID.get(id);
}
