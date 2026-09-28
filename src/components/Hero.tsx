import Icon from "./Icon";
import { Link } from "../lib/router";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16">
      <div className="container-px">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-white/90 backdrop-blur-md px-4 py-1.5 shadow-soft animate-fade-up">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink-700">
              A Student Platform
            </span>
          </div>

          <h1
            className="font-display mt-5 text-4xl sm:text-6xl font-black tracking-tight text-ink-900 leading-[1.08] text-balance animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Shoot Your Shot.
          </h1>

          <p
            className="mt-4 max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-ink-600 font-medium animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Find opportunities. Take on challenges. Build your crew. Make your college years count.
          </p>

          <div
            className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Link href="#aim" className="btn-primary w-full sm:w-auto shadow-card">
              Explore JAVLIN <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="btn-secondary w-full sm:w-auto">
              Create Your Profile
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
