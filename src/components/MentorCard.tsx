import type { MentorCardData } from "../data/mentors";

type MentorCardProps = MentorCardData;

export default function MentorCard({ initials, course, college, year, expertise }: MentorCardProps) {
  return (
    <div className="card hover:border-brand-blue/30 hover:shadow-lift p-6 flex flex-col items-center text-center gap-3 group">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-blue-soft to-brand-red-soft text-brand-blue font-extrabold flex items-center justify-center text-lg shadow-soft transition-transform group-hover:scale-105">
        {initials}
      </div>
      <div>
        <p className="text-sm font-bold text-ink-900">{course}</p>
        <p className="text-xs text-ink-500">{college} · {year}</p>
      </div>
      <p className="text-sm text-ink-700 leading-relaxed">{expertise}</p>
      <span className="btn-outline-blue mt-1 w-full">
        View Profile
      </span>
    </div>
  );
}
