import { useMemo, useState } from "react";
import Icon from "../Icon";
import { toggleFacetValue, type OpportunityFilters } from "../../lib/opportunityFilters";
import type { OpportunityRecord } from "../../lib/dataAccess";

/**
 * The wireframe's Location sidebar.
 *
 * Every place listed here is a value some open listing in this feed actually
 * carries, and "Popular places" ranks those same values by how many listings
 * name them — the reference sheet's Delhi/Bangalore/Mumbai are placeholders for
 * whatever the data says, not a fixed list. `location` is one free-text column,
 * so the heading says "places" rather than promising a city the row does not
 * name. The typed box narrows this list only: it is a question, so like the
 * search field it is never persisted.
 *
 * "Remote only" reads `mode`/`location` text through `isRemoteListing` because
 * there is no `is_remote` column, and it is offered only when a listing here
 * can actually satisfy it.
 */

const POPULAR_COUNT = 3;

function rankLocations(items: OpportunityRecord[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = (item.location ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export default function LocationRail({
  items,
  filters,
  onChange,
  showRemote,
}: {
  items: OpportunityRecord[];
  filters: OpportunityFilters;
  onChange: (next: OpportunityFilters) => void;
  showRemote: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(() => rankLocations(items), [items]);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? ranked.filter((entry) => entry.value.toLowerCase().includes(needle))
    : ranked;
  const visible = needle || expanded ? matches : matches.slice(0, POPULAR_COUNT);

  function toggleCity(value: string) {
    onChange({ ...filters, locations: toggleFacetValue(filters.locations, value) });
  }

  return (
    <aside className="location-rail" aria-label="Location filters">
      <h4 className="rail-title">Location</h4>

      {showRemote && (
        <button
          type="button"
          role="switch"
          aria-checked={filters.remoteOnly}
          onClick={() => onChange({ ...filters, remoteOnly: !filters.remoteOnly })}
          className={`rail-switch ${filters.remoteOnly ? "is-on" : ""}`}
        >
          <span>Remote only</span>
          <span className="rail-switch__track" aria-hidden="true">
            <span className="rail-switch__knob" />
          </span>
        </button>
      )}

      <div className="relative mt-2">
        <label className="sr-only" htmlFor="rail-city-search">
          Search locations
        </label>
        <input
          id="rail-city-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search location"
          className="rail-input pr-8"
        />
        <Icon
          name="search"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        />
      </div>

      {needle ? (
        <p className="rail-subtitle mt-3">
          {matches.length} {matches.length === 1 ? "place" : "places"} match “{query.trim()}”
        </p>
      ) : (
        <p className="rail-subtitle mt-3">{expanded ? "All places" : "Popular places"}</p>
      )}

      {visible.length === 0 ? (
        <p className="mt-1 text-xs text-ink-500">
          No listing in this feed names that place. Clear the search to see the rest.
        </p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {visible.map((entry) => {
            const on = filters.locations.includes(entry.value);
            return (
              <li key={entry.value}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCity(entry.value)}
                  className={`rail-city ${on ? "is-on" : ""}`}
                >
                  <span className="min-w-0 truncate">{entry.value}</span>
                  <span className="rail-city__count">{entry.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!needle && ranked.length > POPULAR_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="rail-more"
        >
          {expanded ? "Fewer places" : `More places (${ranked.length - POPULAR_COUNT})`}
        </button>
      )}
    </aside>
  );
}
