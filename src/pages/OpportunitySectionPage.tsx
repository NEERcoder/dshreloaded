import PageShell from "../components/PageShell";
import OpportunityBrowser, { type PostingCta } from "../components/opportunities/OpportunityBrowser";
import { isHackathonListing, isNotHackathonListing } from "../lib/opportunityKind";
import type { OpportunityRecord } from "../lib/dataAccess";

/**
 * The five opportunity destinations the eight-tab row points at.
 *
 * One component, one configuration per section: each page keeps the same data
 * path (one fetch, one filter engine, one preference store) and differs only in
 * the layout, rail and copy its wireframe specifies. Nothing here decides what
 * a listing is — every count, chip and card value comes from the rows.
 */

export type OpportunitySectionId =
  | "internships"
  | "certifications"
  | "research"
  | "competitions"
  | "hackathons";

type SectionSpec = {
  eyebrow: string;
  /** The reference's heading is the count itself, so this names what is counted. */
  countNoun: { one: string; many: string };
  supportingText: string;
  metaTitle: string;
  metaDescription: string;
  categories: OpportunityRecord["category"][];
  layout: "wide" | "research" | "competition" | "certification";
  sidebar: "none" | "location" | "filters";
  posting: PostingCta;
  featuredChipLabel?: string;
  streamChips?: boolean;
  keywordRailLabel?: string;
  searchPlaceholder: string;
  /** Restricts the feed to the rows this destination may claim. */
  belongs?: (item: OpportunityRecord) => boolean;
  emptyTitle: string;
  emptyDescription: string;
};

const SECTIONS: Record<OpportunitySectionId, SectionSpec> = {
  internships: {
    eyebrow: "Internships",
    countNoun: { one: "open internship", many: "open internships" },
    supportingText: "Verified industry and startup roles for students across India.",
    metaTitle: "Internships | JAVLIN",
    metaDescription:
      "Browse open internships for students across India — role, organisation, stipend, duration and deadline.",
    categories: ["internship"],
    layout: "wide",
    sidebar: "location",
    posting: { above: "Free", label: "Post an internship", below: "Limited time only" },
    featuredChipLabel: "Trending",
    streamChips: true,
    searchPlaceholder: "Search by role, company, field or location…",
    emptyTitle: "No internships are open right now",
    emptyDescription:
      "Verified openings appear here as soon as they are published. Try the Trending chip or clear the filters.",
  },
  certifications: {
    eyebrow: "Certifications",
    countNoun: { one: "open certification", many: "open certifications" },
    supportingText: "Credentials that strengthen the next application — from the organisations that issue them.",
    metaTitle: "Certifications | JAVLIN",
    metaDescription:
      "Find certification programmes for students, filtered by field, duration, mode and provider.",
    categories: ["certification"],
    layout: "certification",
    sidebar: "filters",
    posting: { above: "Limited time deal", label: "List your certification", below: "Free" },
    keywordRailLabel: "Explore by role",
    searchPlaceholder: "Search by course, provider or field…",
    emptyTitle: "No certifications are listed yet",
    emptyDescription:
      "Credential programmes show up here as soon as a provider publishes one.",
  },
  research: {
    eyebrow: "Research",
    countNoun: { one: "open research opportunity", many: "open research opportunities" },
    supportingText: "Faculty projects, lab attachments and funded positions, straight from the groups running them.",
    metaTitle: "Research Opportunities | JAVLIN",
    metaDescription:
      "Browse research assistantships, lab projects and fellowships open to students, by area and institution.",
    categories: ["research"],
    layout: "research",
    sidebar: "location",
    posting: { above: "Limited time", label: "Post a research opportunity", below: "Free" },
    featuredChipLabel: "Trending research",
    keywordRailLabel: "Research areas",
    searchPlaceholder: "Search by institution, topic or field…",
    emptyTitle: "No research openings right now",
    emptyDescription:
      "Projects and assistantships appear here as soon as a group publishes one.",
  },
  competitions: {
    eyebrow: "Competitions",
    countNoun: { one: "open competition", many: "open competitions" },
    supportingText: "Case rounds, contests and challenges — with the deadline, entry shape and prize on the card.",
    metaTitle: "Competitions | JAVLIN",
    metaDescription:
      "Open competitions for students: registration deadlines, team size, prize pool and rounds.",
    categories: ["competition"],
    layout: "competition",
    sidebar: "location",
    posting: { above: "Free", label: "List your event", below: "Limited time only" },
    featuredChipLabel: "Trending",
    belongs: isNotHackathonListing,
    searchPlaceholder: "Search by competition, organiser or field…",
    emptyTitle: "No competitions are open right now",
    emptyDescription:
      "Competitions appear here as soon as they are published. FIELD lists the ones you can enter with a team.",
  },
  hackathons: {
    eyebrow: "Hackathons",
    countNoun: { one: "open hackathon", many: "open hackathons" },
    supportingText:
      "Only listings that name themselves a hackathon. There is no hackathon column yet, so nothing is guessed.",
    metaTitle: "Hackathons | JAVLIN",
    metaDescription:
      "Hackathons open to students — build format, team size, deadline and prize, from the organisers' own listings.",
    categories: ["competition"],
    layout: "competition",
    sidebar: "location",
    posting: { above: "Limited time deal", label: "Post hackathon", below: "Free" },
    featuredChipLabel: "Trending hackathons",
    belongs: isHackathonListing,
    searchPlaceholder: "Search by hackathon, organiser or track…",
    emptyTitle: "No listing here calls itself a hackathon yet",
    emptyDescription:
      "A hackathon is stored as a competition, and the only trustworthy signal on a live row is the word in its own title or field — so nothing is classified here by guesswork. Every competition, hackathon included, is on the Competitions page and in FIELD.",
  },
};

export default function OpportunitySectionPage({ section }: { section: OpportunitySectionId }) {
  const spec = SECTIONS[section];

  return (
    <PageShell title={spec.metaTitle} description={spec.metaDescription} backgroundPreset="opportunities">
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-6 pb-6 sm:pt-10 sm:pb-8">
        <div className="container-px max-w-7xl mx-auto">
          <p className="eyebrow">{spec.eyebrow}</p>
          <OpportunityBrowser
            categories={spec.categories}
            layout={spec.layout}
            sidebar={spec.sidebar}
            countNoun={spec.countNoun}
            supportingText={spec.supportingText}
            posting={spec.posting}
            featuredChipLabel={spec.featuredChipLabel}
            streamChips={spec.streamChips}
            keywordRailLabel={spec.keywordRailLabel}
            belongs={spec.belongs}
            searchPlaceholder={spec.searchPlaceholder}
            emptyTitle={spec.emptyTitle}
            emptyDescription={spec.emptyDescription}
            noResultsTitle="No listing matches those filters"
            noResultsDescription="Remove a chip, widen the location rail, or reset to see everything open."
          />
        </div>
      </section>
    </PageShell>
  );
}
