import Icon from "../Icon";
import { Link } from "../../lib/router";
import SectionHeader from "./SectionHeader";

const TRACKS = [
  { icon: "trophy", label: "Competitions" },
  { icon: "star", label: "Achievements" },
  { icon: "briefcase", label: "Internships" },
  { icon: "flask", label: "Projects" },
  { icon: "award", label: "Certifications" },
  { icon: "users", label: "Leadership" },
];

export default function MarkPreview() {
  return (
    <section id="mark" className="scroll-mt-24 border-t border-surface-border bg-white/60 backdrop-blur-[2px]">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="MARK"
          title="Build your record."
          description="One place for everything you've done — competitions, projects, certifications, and more."
          viewAllHref="/mark"
          viewAllLabel="Build Your MARK"
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TRACKS.map((track) => (
            <div
              key={track.label}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-surface-border bg-white px-3 py-5 text-center shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                <Icon name={track.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold text-ink-900">{track.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/mark" className="btn-primary">
            Start Your MARK
          </Link>
        </div>
      </div>
    </section>
  );
}
