import Icon from "./Icon";

type StarRatingProps = {
  value: number;
  max?: number;
  className?: string;
  starClassName?: string;
};

export default function StarRating({
  value,
  max = 5,
  className = "",
  starClassName = "h-3.5 w-3.5",
}: StarRatingProps) {
  const filled = Math.max(0, Math.min(max, Math.round(value)));

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${filled} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, index) => (
        <Icon
          key={index}
          name="star"
          className={starClassName}
          fill={index < filled ? "currentColor" : "none"}
          opacity={index < filled ? undefined : 0.3}
        />
      ))}
    </span>
  );
}
