import Icon from "../Icon";
import { Link } from "../../lib/router";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";

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
    <section id="mark" className="band pillar-mark tone-dark scroll-mt-24">
      <div className="container-px py-6 sm:py-8 lg:py-10">
        <SectionHeader
          eyebrow="MARK"
          title="Document your college years. Build your record."
          description="One place for everything you've done — competitions, projects, certifications, and more."
          viewAllHref="/mark"
          viewAllLabel="Build Your MARK"
          iconSrc={categoryById("mark")?.iconSrc}
        />
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {TRACKS.map((track) => (
            <div
              key={track.label}
              className="glass-card flex flex-col items-center gap-2 px-3 py-4 text-center sm:gap-2.5 sm:py-5"
            >
              <span className="icon-well h-10 w-10 text-brand-blue">
                <Icon name={track.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold text-ink-900">{track.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-center sm:mt-6">
          <Link href="/mark" className="btn-accent">
            Start Your MARK
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
