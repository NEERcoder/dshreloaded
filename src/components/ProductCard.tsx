import Icon from "./Icon";
import type { ProductCardData } from "../data/exploreDu";

type ProductCardProps = ProductCardData;

export default function ProductCard({ title, description, icon, accent }: ProductCardProps) {
  const accentBg = accent === "red" ? "bg-brand-red-soft text-brand-red" : "bg-brand-blue-soft text-brand-blue";
  return (
    <div className="card card-hover p-6 flex flex-col gap-4 group">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${accentBg} transition-transform group-hover:scale-110`}>
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
    </div>
  );
}
