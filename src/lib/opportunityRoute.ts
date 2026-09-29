/**
 * Canonical opportunity detail URL.
 *
 * /opportunities/:param is overloaded by design: the four slugs below are
 * category filters (they were the route before a detail page existed), and
 * anything else on that path is an opportunity id. Keeping both on one path
 * means no second detail route to keep in sync, and a pasted or refreshed
 * /opportunities/<uuid> resolves to the listing it belongs to.
 */
export const OPPORTUNITY_CATEGORY_PARAMS = [
  "internships",
  "competitions",
  "research",
  "certifications",
] as const;

export type OpportunityCategoryParam = (typeof OPPORTUNITY_CATEGORY_PARAMS)[number];

export function isOpportunityCategoryParam(param: string): param is OpportunityCategoryParam {
  return (OPPORTUNITY_CATEGORY_PARAMS as readonly string[]).includes(param);
}

/** Every opportunity card in the app must build its link here. */
export function opportunityHref(id: string): string {
  return `/opportunities/${id}`;
}

/**
 * Category filter a given opportunity category maps to, or null when the
 * category has no filter page of its own (jobs, fellowships, scholarships all
 * live inside the internships feed).
 */
export function opportunityCategoryParam(
  category: string
): OpportunityCategoryParam | null {
  switch (category) {
    case "internship":
      return "internships";
    case "competition":
      return "competitions";
    case "research":
      return "research";
    case "certification":
      return "certifications";
    default:
      return null;
  }
}
