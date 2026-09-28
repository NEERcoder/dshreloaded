import { JAVLIN_CATEGORIES } from "../../lib/categories";
import { Link } from "../../lib/router";
import CategoryCard from "./CategoryCard";

/**
 * Primary homepage discovery: the six JAVLIN areas as 3D icon cards.
 * These replace the six section links that used to sit in the top navigation.
 */
export default function CategorySelector() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1
        className="font-display mt-5 text-center text-4xl font-black leading-[1.08] tracking-tight text-ink-900 animate-fade-up text-balance sm:text-5xl lg:text-6xl"
        style={{ animationDelay: "80ms" }}
      >
        Where do you want to go?
      </h1>

      <p
        className="mx-auto mt-4 max-w-xl animate-fade-up text-center text-base font-medium leading-relaxed text-ink-600 sm:text-lg"
        style={{ animationDelay: "140ms" }}
      >
        Find opportunities, people, teams and experiences that move you forward.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-10 lg:gap-5">
        {JAVLIN_CATEGORIES.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
      </div>

      <p
        className="mt-7 animate-fade-up text-center text-sm font-semibold text-ink-500"
        style={{ animationDelay: "420ms" }}
      >
        Already know your shot?{" "}
        <Link href="/signup" className="text-brand-blue hover:text-brand-blue-dark underline-offset-4 hover:underline">
          Create your profile
        </Link>
      </p>
    </div>
  );
}
