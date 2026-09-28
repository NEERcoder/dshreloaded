type BrandMarkProps = {
  className?: string;
};

// Official JAVLIN symbol — source-of-truth uploaded asset; do not redraw, recolor, or approximate.
export default function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <img
      src="/brand/javlin-symbol.png"
      alt="JAVLIN"
      width={2000}
      height={2000}
      draggable={false}
      className={`w-auto object-contain ${className}`}
    />
  );
}
