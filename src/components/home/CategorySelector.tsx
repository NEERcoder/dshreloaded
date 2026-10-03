import BrandMark from "../BrandMark";
import CategoryCard from "./CategoryCard";
import { JAVLIN_CATEGORIES } from "../../lib/categories";

/**
 * Primary homepage discovery: the six JAVLIN areas as 3D icon cards under a
 * small logo lockup. These replace the six section links that used to sit in
 * the top navigation.
 */
/**
 * Primary homepage discovery: the six JAVLIN areas as 3D icon cards under a
 * small logo lockup. These replace the six section links that used to sit in
 * the top navigation. The whole lockup sits on one frosted launcher panel so
 * the hero reads as the same design system as the section bands below it.
 */
export default function CategorySelector() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* The lockup sits on the navy canvas itself, so the headline can be a
          real white display line instead of dark text on frosted glass. */}
      <div className="animate-fade-up text-center">
        <p className="hero-eyebrow">Welcome to JAVLIN</p>
        <h1 className="hero-title mt-2 font-display">
          Shoot your <span className="text-brand-orange">shot.</span>
        </h1>
      </div>

      <div className="glass-panel launcher-panel mt-5 animate-fade-up rounded-2xl p-3.5 shadow-soft sm:mt-7 sm:rounded-3xl sm:p-5 lg:p-7" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-center gap-2">
          <BrandMark className="h-7 w-auto sm:h-8" />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
            Six areas, one campus
          </p>
        </div>

        {/* Mobile: all six areas in one 3x2 grid so the launcher and Trending share
            the first viewport. Desktop keeps the single six-across row. */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3 lg:grid-cols-6 lg:gap-4">
          {JAVLIN_CATEGORIES.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
