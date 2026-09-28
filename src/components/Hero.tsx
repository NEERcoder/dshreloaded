import CategorySelector from "./home/CategorySelector";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16">
      <div className="container-px">
        <div className="flex justify-center">
          <div className="glass-chip glass-edge inline-flex animate-fade-up items-center gap-2 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-red" />
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink-700">
              Explore JAVLIN
            </span>
          </div>
        </div>

        <CategorySelector />
      </div>
    </section>
  );
}
