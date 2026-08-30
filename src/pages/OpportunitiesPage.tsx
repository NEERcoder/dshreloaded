import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import { opportunityCategories } from "../data/opportunityCategories";
import { getOpportunities, type OpportunityRecord } from "../lib/dataAccess";

const categoryMap: Record<string, OpportunityRecord["category"]> = {
  internships: "internship",
  competitions: "competition",
  research: "research",
  certifications: "certification",
};

function OpportunityList({ category }: { category?: OpportunityRecord["category"] }) {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [paid, setPaid] = useState("");
  const [sort, setSort] = useState("featured");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOpportunities(category).then((result) => {
      if (cancelled) return;
      setItems(result.data);
      setError(result.error);
    });
    return () => { cancelled = true; };
  }, [category]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return items
      .filter((item) => {
        const searchable = [item.title, item.organization, item.field, item.location, item.description, ...item.eligibleCourses].join(" ").toLowerCase();
        const isPaid = Boolean(item.stipend && !/unpaid|voluntary/i.test(item.stipend));
        return (!query || searchable.includes(query)) && (!mode || item.mode === mode) && (!paid || (paid === "paid" ? isPaid : !isPaid));
      })
      .sort((a, b) => sort === "deadline" ? (a.deadline || "z").localeCompare(b.deadline || "z") : Number(b.featured) - Number(a.featured));
  }, [items, mode, paid, search, sort]);

  return (
    <div className="mt-8">
      <div className="card p-4 sm:p-5">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunities by title, organization or field" className="field-input pl-10" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select value={mode} onChange={(event) => setMode(event.target.value)} className="filter-select"><option value="">All modes</option><option>Remote</option><option>On-site</option><option>Hybrid</option></select>
          <select value={paid} onChange={(event) => setPaid(event.target.value)} className="filter-select"><option value="">Paid or unpaid</option><option value="paid">Paid</option><option value="unpaid">Unpaid / not listed</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="filter-select"><option value="featured">Sort: featured</option><option value="deadline">Sort: deadline</option></select>
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold text-ink-700">{filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}</p>
      {error ? (
        <div className="card mt-5 border-dashed p-8 text-center"><h3 className="font-bold text-ink-900">Opportunities are not available yet</h3><p className="mt-2 text-sm text-ink-500">{error}</p></div>
      ) : filtered.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => <OpportunityItem item={item} key={item.id} />)}
        </div>
      ) : (
        <div className="card mt-5 border-dashed p-8 sm:p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-red-soft text-brand-red flex items-center justify-center"><Icon name="flag" className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-bold text-ink-900">No published opportunities yet</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500">Listings will appear here after they are added and published by the DU Science Hub team. We won’t fabricate counts or deadlines.</p>
        </div>
      )}
    </div>
  );
}

function OpportunityItem({ item }: { item: OpportunityRecord }) {
  return (
    <article className="card card-hover p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md bg-brand-blue-soft px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue">{item.category}</span>
        {item.featured && <span className="text-xs font-bold text-brand-red">Featured</span>}
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-ink-900">{item.title}</h3>
      <p className="mt-2 text-sm font-semibold text-ink-700">{item.organization}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-500">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-400">
        {item.field && <span>{item.field}</span>}
        {item.location && <span>{item.location}</span>}
        {item.mode && <span>{item.mode}</span>}
        {item.deadline && <span>Deadline: {item.deadline}</span>}
      </div>
      {item.applicationUrl ? <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="btn-outline-blue mt-5 w-full">View details <Icon name="arrow" className="h-4 w-4" /></a> : <span className="mt-5 block text-center text-xs font-semibold text-ink-400">Application details coming soon</span>}
    </article>
  );
}

export default function OpportunitiesPage({ categoryId }: { categoryId?: string }) {
  const category = categoryId ? categoryMap[categoryId] : undefined;
  const selectedCategory = categoryId ? opportunityCategories.find((item) => item.id === categoryId) : undefined;

  return (
    <PageShell title={selectedCategory ? `${selectedCategory.title} | DU Science Hub` : "Science Internships, Jobs & Competitions | DU Science Hub"} description="Find science internships, competitions, research and certifications for DU students.">
      <section className="bg-brand-blue-pale border-b border-surface-border">
        <div className="container-px py-14 sm:py-20 lg:py-24">
          <p className="eyebrow">Opportunities</p>
          <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">{selectedCategory?.title || "Find Opportunities"}</h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-500">{selectedCategory?.description || "Internships, Jobs & Opportunities for BSc & Science Students."}</p>
        </div>
      </section>
      {!categoryId && (
        <section className="py-14 sm:py-20">
          <div className="container-px">
            <SectionHeading eyebrow="Explore categories" title="Choose what you’re looking for" description="Browse the categories currently supported by DU Science Hub. Future categories stay inactive until real listings are available." />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {opportunityCategories.filter((item) => ["internships", "competitions", "research", "certifications"].includes(item.id)).map((item) => (
                <a key={item.id} href={`/opportunities/${item.id}`} className="card card-hover p-5">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${item.accent === "red" ? "bg-brand-red-soft text-brand-red" : "bg-brand-blue-soft text-brand-blue"}`}><Icon name={item.icon} className="h-5 w-5" /></div>
                  <h2 className="mt-4 font-bold text-ink-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue">View opportunities <Icon name="arrow" className="h-4 w-4" /></span>
                </a>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-brand-blue/15 bg-brand-blue-soft/50 p-5 sm:p-6"><p className="text-sm font-bold text-brand-blue">Build the skills recruiters look for.</p><p className="mt-1 text-sm text-ink-500">Explore relevant certifications before applying to an opportunity.</p><a href="/opportunities/certifications" className="mt-3 inline-flex text-sm font-bold text-brand-blue hover:underline">Explore certifications →</a></div>
          </div>
        </section>
      )}
      <section className={`${categoryId ? "py-14 sm:py-20" : "border-t border-surface-border bg-surface-soft py-14 sm:py-20"}`}>
        <div className="container-px">
          {categoryId && <a href="/opportunities" className="text-sm font-semibold text-brand-blue hover:underline">← All opportunities</a>}
          <OpportunityList category={category} />
        </div>
      </section>
    </PageShell>
  );
}
