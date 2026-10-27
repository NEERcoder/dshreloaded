import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { yearLabel } from "./StudentCard";

/**
 * The directory's search and its four refinements, as one control.
 *
 * The dropdowns used to be a row of four selects in a card of their own, which
 * made the least-used part of the page the loudest. They now live behind a
 * small Filters button set into the trailing end of the search field, so
 * narrowing a search and running it are the same gesture. The button carries
 * how many of the four are set, because a filtered list that looks unfiltered
 * is worse than a hidden control.
 *
 * It is presentational on purpose: the filter values belong to the page, which
 * also clears them from the college banner and the empty state. Only the
 * popover's open state lives here, next to the element it is anchored to.
 */

type Option = { value: string; label: string; options: string[]; render?: (value: string) => string };

export default function CircleDirectorySearch({
  search,
  onSearch,
  values,
  onValue,
  optionSets,
  selectCount,
}: {
  search: string;
  onSearch: (next: string) => void;
  values: { college: string; course: string; year: string; graduation: string };
  onValue: (key: keyof typeof values, next: string) => void;
  optionSets: { college: string[]; course: string[]; year: string[]; graduation: string[] };
  selectCount: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selects: Option[] = [
    { value: "college", label: "College", options: optionSets.college, render: () => "All Colleges" },
    { value: "course", label: "Course", options: optionSets.course, render: () => "All Courses" },
    {
      value: "year",
      label: "Year of study",
      options: optionSets.year,
      render: (option) => yearLabel(Number(option)),
    },
    {
      value: "graduation",
      label: "Graduation year",
      options: optionSets.graduation,
      render: () => "Any Graduation Year",
    },
  ];

  return (
    <div ref={wrapRef} className="relative flex items-stretch gap-1.5">
      <div className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor="circle-search">
          Search students
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
        />
        <input
          id="circle-search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search students by name, course or college…"
          className="field-input h-full pl-11"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        className="chip-toggle flex-none px-3 text-[11px]"
      >
        <Icon name="filter" className="h-3.5 w-3.5" />
        Filters
        {selectCount > 0 && (
          <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-black text-white">
            {selectCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="group"
          aria-label="Filter students"
          className="card absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 bg-white p-3 shadow-lift sm:left-auto sm:w-[min(24rem,100%)] sm:p-4"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {selects.map((select) => (
              <label key={select.value} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  {select.label}
                </span>
                <select
                  value={values[select.value as keyof typeof values]}
                  onChange={(event) => onValue(select.value as keyof typeof values, event.target.value)}
                  className="filter-select mt-1 w-full text-xs"
                >
                  <option value="">{select.render ? select.render("") : `All ${select.label}s`}</option>
                  {select.options.map((option) => (
                    <option key={option} value={option}>
                      {select.render && option !== "" ? select.render(option) : option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
