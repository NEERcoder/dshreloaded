import CategoryCard from "./CategoryCard";
import { LAUNCHER_CATEGORIES } from "../../lib/categories";

/**
 * Primary homepage discovery: four JAVLIN areas as cards. CREW and MARK live in
 * the rail and drawer, not here.
 *
 * The panel carries no wordmark of its own — the site header already owns the
 * brand, and the space it used belongs to the cards and the section below them.
 *
 * Phones use a two-column bento: AIM and FIELD fill the first row as the primary
 * cards, CIRCLE and PULSE sit under them as compact supporting cards with live
 * previews. The grid switches to one row of four only when the cards have room.
 */
export default function CategorySelector() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-panel launcher-panel animate-fade-up rounded-2xl p-2.5 shadow-soft sm:rounded-3xl sm:p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {LAUNCHER_CATEGORIES.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
