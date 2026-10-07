import { useEffect, useState } from "react";
import { useLocation } from "../lib/router";
import { getActiveHomepageAnimation, type HomepageAnimationRecord } from "../lib/dataAccess";

/**
 * The compact, admin-controlled animation that sits in front of the college
 * search on the homepage header.
 *
 * Three things decide whether it renders at all: the route, whether an admin
 * has an animation enabled, and whether the image actually decoded. Each of
 * them resolves to rendering nothing rather than a placeholder box, because an
 * empty frame in a 64px header reads as a layout bug while absence reads as a
 * design choice — and §4E allows either.
 *
 * The row height is fixed, so an animation can never make the header taller.
 */
export default function HomepageAnimation() {
  const { path } = useLocation();
  const [animation, setAnimation] = useState<HomepageAnimationRecord | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveHomepageAnimation().then((result) => {
      if (cancelled) return;
      setAnimation(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!animation || failed || path !== "/") return null;

  return (
    <div className="hidden h-10 shrink-0 items-center lg:flex">
      <img
        src={animation.fileUrl}
        alt=""
        aria-hidden="true"
        title={animation.title}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-10 w-auto max-w-[132px] rounded-lg object-contain"
      />
    </div>
  );
}
