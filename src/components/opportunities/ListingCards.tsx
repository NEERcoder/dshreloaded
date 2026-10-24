import type { ReactNode } from "react";
import Icon from "../Icon";
import DeadlinePill from "./DeadlinePill";
import PosterFrame from "./PosterFrame";
import { Link } from "../../lib/router";
import { sanitizeExternalUrl } from "../../lib/urlSafety";
import { opportunityHref } from "../../lib/opportunityRoute";
import { listingFacts } from "../../lib/opportunityFacts";
import { formatPrizeAmount, teamSizeLabel } from "../../lib/prize";
import { competitionRegistrationOptions, type OpportunityRecord } from "../../lib/dataAccess";

/**
 * The feed cards, one layout per destination.
 *
 * Each layout follows its wireframe, and every slot in it is filled from a
 * column that exists. Where the reference asks for something the schema has no
 * column for — a skills list, a per-listing company logo, a department — the
 * card shows the nearest fact the record really carries under its own name, or
 * shows nothing at all. A slot is never padded with a guess: there is no
 * `is_remote`, `skills_required` or `logo_url` column, so no card claims one.
 */

function Monogram({ text, className = "" }: { text: string; className?: string }) {
  const letter = (text.trim()[0] ?? "•").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-[11px] font-black text-brand-blue ${className}`}
    >
      {letter}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="listing-panel">
      <p className="listing-panel__title">{title}</p>
      {children}
    </div>
  );
}

function FactToken({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-soft px-2 py-1 text-[11px] font-bold text-ink-700">
      <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-ink-500" />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

function ApplyAction({ item, block = false }: { item: OpportunityRecord; block?: boolean }) {
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);
  if (!safeUrl) {
    return (
      <Link
        href={opportunityHref(item.id)}
        className={`btn-outline-blue justify-center text-[13px] font-bold uppercase tracking-wider ${block ? "w-full" : ""}`}
      >
        View details
      </Link>
    );
  }
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noreferrer"
      className={`btn-primary justify-center text-[13px] font-bold uppercase tracking-wider ${block ? "w-full" : ""}`}
    >
      Apply now <Icon name="external" className="h-4 w-4" />
    </a>
  );
}

/**
 * Internships — the reference card: poster with its own "Full details" footer,
 * then role, organisation and mode chips with the apply action, then the
 * listing's own facts in dashed panels, then a short read of the description.
 */
export function WideListingCard({ item }: { item: OpportunityRecord }) {
  const href = opportunityHref(item.id);
  const facts = listingFacts(item);
  const chips = facts.filter((fact) => fact.key === "mode" || fact.key === "location");
  const role = facts.filter((fact) => ["field", "courses", "duration"].includes(fact.key));
  const perks = facts.filter((fact) => ["stipend", "rewards"].includes(fact.key));

  return (
    <article className="card listing-wide bg-white">
      <div className="lw-poster flex w-[92px] shrink-0 flex-col sm:w-[112px] lg:w-[124px]">
        <Link
          href={href}
          aria-label={`Open ${item.title}`}
          className="block overflow-hidden rounded-lg border border-surface-border bg-surface-soft"
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={`${item.organization} poster`}
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] w-full object-cover"
            />
          ) : (
            <span className="poster-empty flex aspect-[3/4] w-full items-center justify-center px-1 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">
                {item.organization}
              </span>
            </span>
          )}
        </Link>
        <Link
          href={href}
          className="lw-poster__details mt-auto flex min-h-[34px] items-center justify-center gap-1 rounded-lg border border-surface-border bg-white px-1 text-[11px] font-bold text-ink-700 hover:border-brand-blue/40 hover:text-brand-blue"
        >
          Full details
          <Icon name="external" className="h-3 w-3 -rotate-45" />
        </Link>
      </div>

      <div className="lw-identity min-w-0 flex-1 basis-[176px] xl:basis-[164px]">
        <h3 className="card-title line-clamp-2 text-ink-900">
          <Link href={href} className="hover:text-brand-blue">
            {item.title}
          </Link>
        </h3>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink-600">
          <Monogram text={item.organization} className="h-5 w-5" />
          <span className="min-w-0 break-words">{item.organization}</span>
        </p>
        {chips.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((fact) => (
              <FactToken key={fact.key} icon={fact.icon}>
                {fact.value}
              </FactToken>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ApplyAction item={item} />
          <DeadlinePill opportunity={item} />
        </div>
      </div>

      {role.length > 0 && (
        <Panel title="This role">
          <ul className="flex flex-wrap gap-1.5">
            {role.map((fact) => (
              <FactToken key={fact.key} icon={fact.icon}>
                {fact.value}
              </FactToken>
            ))}
          </ul>
        </Panel>
      )}

      {perks.length > 0 && (
        <Panel title="Perks">
          <ul className="flex flex-wrap gap-1.5">
            {perks.map((fact) => (
              <FactToken key={fact.key} icon={fact.icon}>
                {fact.value}
              </FactToken>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="About">
        <p className="line-clamp-4 text-[12px] leading-relaxed text-ink-600">{item.description}</p>
      </Panel>
    </article>
  );
}

/**
 * Research — round institution mark, then who is running it, what area and what
 * the student gets, with the action beside it. There is no supervisor or
 * department column, so the card names the two it has: `organization` and
 * `field`.
 */
export function ResearchListingCard({ item }: { item: OpportunityRecord }) {
  const href = opportunityHref(item.id);
  const perks = listingFacts(item).filter((fact) => ["rewards", "stipend", "duration"].includes(fact.key));

  return (
    <article className="card card-interactive flex items-center gap-3 bg-white p-4">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-14 w-14 shrink-0 rounded-full border border-surface-border object-cover"
        />
      ) : (
        <Monogram text={item.organization} className="h-14 w-14 text-base" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-ink-900">{item.organization}</p>
        <h3 className="card-title mt-0.5 line-clamp-2 text-[15px] text-ink-900">
          <Link href={href} className="hover:text-brand-blue">
            {item.title}
          </Link>
        </h3>
        {item.field && (
          <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wider text-ink-500">
            {item.field}
          </p>
        )}
        {perks.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {perks.map((fact) => (
              <FactToken key={fact.key} icon={fact.icon}>
                {fact.value}
              </FactToken>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-1.5">
        <ApplyAction item={item} />
        <DeadlinePill opportunity={item} className="justify-center" />
      </div>
    </article>
  );
}

/**
 * Competitions and Hackathons — the reference's poster-forward card: the
 * time-left tab sits on the poster's top edge, the organiser row above the
 * title, and entry shape, prize and the live registered count beside the
 * register action. A count that could not be fetched is left out rather than
 * shown as zero.
 */
export function CompetitionListingCard({
  item,
  registeredTeams,
}: {
  item: OpportunityRecord;
  registeredTeams: number | null;
}) {
  const href = opportunityHref(item.id);
  const entry = competitionRegistrationOptions(item);
  const shape = item.teamFormationEnabled
    ? teamSizeLabel(item)
    : sanitizeExternalUrl(item.applicationUrl)
      ? "Apply to enter"
      : null;
  const prize =
    item.prizeAmount !== null && item.prizeAmount !== undefined ? formatPrizeAmount(item.prizeAmount) : null;

  return (
    <article className="card flex gap-3 bg-white p-3 sm:gap-4 sm:p-4">
      <div className="relative w-[104px] shrink-0 sm:w-[124px]">
        <DeadlinePill
          opportunity={item}
          className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap shadow-soft"
        />
        <Link href={href} className="block overflow-hidden rounded-lg border border-surface-border">
          <PosterFrame item={item} />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold text-ink-600">
          <Monogram text={item.organization} className="h-5 w-5" />
          <span className="min-w-0 break-words">{item.organization}</span>
        </p>
        <h3 className="card-title mt-1 line-clamp-2 text-ink-900">
          <Link href={href} className="hover:text-brand-blue">
            {item.title}
          </Link>
        </h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shape && <FactToken icon="users">{shape}</FactToken>}
          {prize && <FactToken icon="trophy">{prize}</FactToken>}
          {item.rewards && <FactToken icon="award">{item.rewards}</FactToken>}
          {(item.rounds?.length ?? 0) > 0 && (
            <FactToken icon="flag">{`${item.rounds?.length} round${item.rounds?.length === 1 ? "" : "s"}`}</FactToken>
          )}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {entry.solo || entry.createTeam ? (
            <Link href={href} className="btn-primary justify-center text-[13px] font-bold uppercase tracking-wider">
              Register
            </Link>
          ) : (
            <ApplyAction item={item} />
          )}
          {registeredTeams !== null && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500" aria-live="polite">
              {registeredTeams} registered
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Certifications — the wireframe's tall poster tile. Under the poster sit two
 * rows: the provider beside a "Full details" action, then the course name.
 * There is no price, accreditation or demand column, so none of those appear;
 * duration/mode/field show only when the record carries them. The enrol link is
 * kept (it is real behaviour) as a quiet text action under the course name.
 */
export function CertificationListingCard({ item }: { item: OpportunityRecord }) {
  const href = opportunityHref(item.id);
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);
  const facts = listingFacts(item)
    .filter((fact) => ["duration", "mode"].includes(fact.key))
    .slice(0, 2);

  return (
    <article className="card card-interactive listing-cert group flex h-full flex-col overflow-hidden bg-white p-0">
      <Link href={href} aria-label={`Open ${item.title}`} className="listing-cert__poster block overflow-hidden">
        <PosterFrame item={item} ratio="5 / 4" className="listing-poster-zoom" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="flex items-stretch gap-1.5">
          <p
            title={item.organization}
            className="flex min-w-0 flex-1 items-center rounded-lg border border-surface-border bg-surface-soft px-2 text-[11px] font-bold text-ink-600"
          >
            <span className="truncate">{item.organization}</span>
          </p>
          <Link
            href={href}
            className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-lg border border-surface-border bg-white px-2 text-[11px] font-bold text-ink-700 transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
          >
            Full details
            <Icon name="external" className="h-3 w-3 -rotate-45" />
          </Link>
        </div>
        <h3 className="card-title line-clamp-2 rounded-lg border border-surface-border px-2 py-1.5 text-[13px] leading-snug text-ink-900">
          <Link href={href} className="hover:text-brand-blue">
            {item.title}
          </Link>
        </h3>
        {(facts.length > 0 || safeUrl) && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-0.5">
            {facts.map((fact) => (
              <span key={fact.key} className="text-[11px] font-semibold text-ink-500">
                {fact.value}
              </span>
            ))}
            {safeUrl && (
              <a
                href={safeUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue hover:underline"
              >
                Enrol <Icon name="external" className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Hackathons — its own surface instead of a recoloured competition card: a navy
 * panel with the poster on the left and the build facts on the right. Every slot
 * is the same real data the competition card reads (organiser, title, team
 * shape, prize, rounds, registered count); nothing hackathon-specific is
 * invented, because there is no hackathon column.
 */
export function HackathonListingCard({
  item,
  registeredTeams,
}: {
  item: OpportunityRecord;
  registeredTeams: number | null;
}) {
  const href = opportunityHref(item.id);
  const entry = competitionRegistrationOptions(item);
  const shape = item.teamFormationEnabled
    ? teamSizeLabel(item)
    : sanitizeExternalUrl(item.applicationUrl)
      ? "Apply to enter"
      : null;
  const prize =
    item.prizeAmount !== null && item.prizeAmount !== undefined ? formatPrizeAmount(item.prizeAmount) : null;
  const rounds = item.rounds?.length ?? 0;

  return (
    <article className="hackathon-card card-interactive group">
      <div className="relative w-[104px] shrink-0 sm:w-[132px]">
        <DeadlinePill
          opportunity={item}
          className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap shadow-soft"
        />
        <Link href={href} className="block overflow-hidden rounded-lg border border-white/15">
          <PosterFrame item={item} ratio="4 / 5" className="listing-poster-zoom" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="hackathon-card__kicker">
          <Icon name="code" className="h-3.5 w-3.5" />
          Hackathon
        </p>
        <h3 className="card-title mt-1 line-clamp-2 text-[16px] text-white">
          <Link href={href} className="hover:text-brand-blue-soft">
            {item.title}
          </Link>
        </h3>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/70">
          <Monogram text={item.organization} className="h-5 w-5 !bg-white/15 !text-white" />
          <span className="min-w-0 break-words">{item.organization}</span>
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shape && <FactToken icon="users">{shape}</FactToken>}
          {prize && <FactToken icon="trophy">{prize}</FactToken>}
          {item.rewards && <FactToken icon="award">{item.rewards}</FactToken>}
          {rounds > 0 && <FactToken icon="flag">{`${rounds} round${rounds === 1 ? "" : "s"}`}</FactToken>}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {entry.solo || entry.createTeam ? (
            <Link href={href} className="hackathon-card__cta">
              Register
            </Link>
          ) : sanitizeExternalUrl(item.applicationUrl) ? (
            <a href={sanitizeExternalUrl(item.applicationUrl) ?? href} target="_blank" rel="noreferrer" className="hackathon-card__cta">
              Apply now <Icon name="external" className="h-4 w-4" />
            </a>
          ) : (
            <Link href={href} className="hackathon-card__cta">
              View details
            </Link>
          )}
          {registeredTeams !== null && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70" aria-live="polite">
              {registeredTeams} registered
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
