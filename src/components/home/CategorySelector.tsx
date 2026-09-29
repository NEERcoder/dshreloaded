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
    <div className="glass-panel mx-auto max-w-6xl rounded-3xl p-5 shadow-soft sm:p-7">
      <div className="flex animate-fade-up flex-col items-center">
        <BrandMark className="h-12 w-auto sm:h-14" />
        <p className="mt-3 text-base font-semibold text-ink-600 sm:text-lg">Shoot your shot.</p>
      </div>

      <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-6 lg:gap-4">
        {JAVLIN_CATEGORIES.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
      </div>
    </div>
  );
}
