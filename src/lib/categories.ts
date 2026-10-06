export type CategoryId = "aim" | "field" | "crew" | "circle" | "mark" | "pulse";

export type JavlinCategory = {
  id: CategoryId;
  label: string;
  /** Existing route — the selector links to the pages, it never duplicates them. */
  href: string;
  iconSrc: string;
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
    description: "Certificates • Internships • Jobs",
  },
  {
    id: "field",
    label: "FIELD",
    href: "/field",
    iconSrc: "/categories/field.png",
    description: "Competitions",
  },
  {
    id: "crew",
    label: "CREW",
    href: "/crew",
    iconSrc: "/categories/crew.png",
    description: "Teams",
  },
  {
    id: "circle",
    label: "CIRCLE",
    href: "/circle",
    iconSrc: "/categories/circle.png",
    description: "Connections",
  },
  {
    id: "mark",
    label: "MARK",
    href: "/mark",
    iconSrc: "/categories/mark.png",
    description: "Record Your College Life",
  },
  {
    id: "pulse",
    label: "PULSE",
    href: "/pulse",
    iconSrc: "/categories/pulse.png",
    description: "News",
  },
];

const BY_ID = new Map(JAVLIN_CATEGORIES.map((category) => [category.id, category]));

export function categoryById(id: CategoryId): JavlinCategory | undefined {
  return BY_ID.get(id);
}
