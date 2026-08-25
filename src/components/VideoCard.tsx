import Icon from "./Icon";
import type { VideoCardData } from "../data/videos";

type VideoCardProps = VideoCardData;

export default function VideoCard({ category, title, duration, accent }: VideoCardProps) {
  const accentBg = accent === "red" ? "from-brand-red-soft to-brand-red-soft/30" : "from-brand-blue-soft to-brand-blue-soft/30";
  const accentRing = accent === "red" ? "text-brand-red" : "text-brand-blue";
  return (
    <div className="card card-hover overflow-hidden group flex flex-col">
      <div className={`relative aspect-video bg-gradient-to-br ${accentBg} flex items-center justify-center`}>
        <div className={`h-14 w-14 rounded-full bg-white shadow-card flex items-center justify-center ${accentRing} transition-transform group-hover:scale-110`}>
          <Icon name="play" className="h-7 w-7" />
        </div>
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-ink-900/80 text-white text-xs font-medium">
          {duration}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">{category}</span>
        <p className="text-sm font-semibold text-ink-900 leading-snug">{title}</p>
      </div>
    </div>
  );
}
