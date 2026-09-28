export type CategoryId = "aim" | "field" | "crew" | "circle" | "mark" | "pulse";

export type JavlinCategory = {
  id: CategoryId;
  label: string;
  /** Existing route — the selector links to the pages, it never duplicates them. */
  href: string;
  iconSrc: string;
  description: string;
};

export const JAVLIN_CATEGORIES: JavlinCategory[] = [
  {
    id: "aim",
    label: "AIM",
    href: "/aim",
    iconSrc: "/categories/aim.png",
    description: "Goals, careers & direction",
  },
  {
    id: "field",
    label: "FIELD",
    href: "/field",
    iconSrc: "/categories/field.png",
    description: "Opportunities & real-world experience",
  },
  {
    id: "crew",
    label: "CREW",
    href: "/crew",
    iconSrc: "/categories/crew.png",
    description: "Teams, clubs & collaboration",
  },
  {
    id: "circle",
    label: "CIRCLE",
    href: "/circle",
    iconSrc: "/categories/circle.png",
    description: "Find and connect with students",
  },
  {
    id: "mark",
    label: "MARK",
    href: "/mark",
    iconSrc: "/categories/mark.png",
    description: "Achievements & your student record",
  },
  {
    id: "pulse",
    label: "PULSE",
    href: "/pulse",
    iconSrc: "/categories/pulse.png",
    description: "What's happening around you",
  },
];

const BY_ID = new Map(JAVLIN_CATEGORIES.map((category) => [category.id, category]));

export function categoryById(id: CategoryId): JavlinCategory | undefined {
  return BY_ID.get(id);
}
