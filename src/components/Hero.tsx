import CategorySelector from "./home/CategorySelector";

/**
 * The launcher sits under a fixed header that is 64px tall on phones and 80px
 * from `sm` up, so the top padding only has to clear that and add a little air.
 * Anything more pushes Trending — the section people actually came to see —
 * down out of the first viewport.
 */
export default function Hero() {
  return (
    <section className="on-navy relative overflow-hidden pb-2 pt-[72px] sm:pb-3 sm:pt-[88px] lg:pt-24">
      <div className="container-px">
        <CategorySelector />
      </div>
    </section>
  );
}
