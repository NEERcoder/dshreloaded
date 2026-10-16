import CategoryCard from "./CategoryCard";
import { JAVLIN_CATEGORIES } from "../../lib/categories";

/**
 * Primary homepage discovery: the six JAVLIN areas as 3D icon cards. These
 * replace the six section links that used to sit in the top navigation. The
 * panel is deliberately short — the headline it used to carry pushed Trending
 * and its posters below the first viewport.
 */
export default function CategorySelector() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-panel launcher-panel animate-fade-up rounded-2xl p-3 shadow-soft sm:rounded-3xl sm:p-4 lg:p-5">
        {/* The wordmark is branding, not navigation — on phones it only pushed
            the launcher's six tiles down, so below 640px the header keeps the
            JAVLIN identity and the launcher drops straight into the grid. */}
        <div className="hidden items-center justify-center gap-2.5 sm:flex">
          {/* The approved wordmark carries the same navy as the canvas as its
              own ground, so `lighten` lets the surface behind it show through
              untouched instead of framing it in a box. */}
          <img
            src="/brand/javlin-wordmark.png"
            alt="JAVLIN"
            width={764}
            height={237}
            className="h-5 w-auto object-contain mix-blend-lighten sm:h-6"
          />
        </div>

        {/* Mobile: all six areas in one 3x2 grid so the launcher and Trending share
            the first viewport. Desktop keeps the single six-across row. */}
        <div className="grid grid-cols-3 gap-2 sm:mt-4 sm:gap-2.5 lg:grid-cols-6 lg:gap-3">
          {JAVLIN_CATEGORIES.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
