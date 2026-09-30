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
    <div className="glass-panel mx-auto max-w-6xl rounded-2xl p-3.5 shadow-soft sm:rounded-3xl sm:p-5 lg:p-7">
      <div className="flex animate-fade-up flex-col items-center">
        <BrandMark className="h-9 w-auto sm:h-12 lg:h-14" />
        <p className="mt-1.5 text-[13px] font-semibold text-ink-600 sm:text-base lg:text-lg">
          Shoot your shot.
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
  );
}
