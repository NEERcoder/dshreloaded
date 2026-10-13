import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import type { PosterCrop } from "../../lib/localProvider";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  clampCrop,
  cropIsDraggable,
  posterCropStyle,
} from "../../lib/posterCrop";

type Props = {
  imageUrl: string;
  crop: PosterCrop | null | undefined;
  onChange: (crop: PosterCrop) => void;
};

/**
 * Positions the 676:451 card crop over the original poster.
 *
 * Nothing here re-encodes or re-uploads the image: the drag and the zoom only
 * produce normalised numbers, which are stored beside the listing and replayed
 * by the card at its own size. The original stays whole for the detail page.
 */
export default function PosterCropStudio({ imageUrl, crop, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [sizeKnown, setSizeKnown] = useState(false);
  const [draft, setDraft] = useState<PosterCrop>(crop ?? DEFAULT_CROP);

  // A different poster is a different image, so the framing a drag produced
  // against the old one no longer describes anything. This deliberately keys on
  // the URL only: writing the crop back would otherwise reset the draft in the
  // middle of a drag.
  useEffect(() => {
    setDraft(crop ?? DEFAULT_CROP);
    setSizeKnown(false);
    naturalRef.current = { width: 0, height: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <p className="rounded-xl border-2 border-dashed border-surface-border bg-surface-soft p-4 text-center text-xs text-ink-500">
        Upload a poster to frame the card crop.
      </p>
    );
  }

  function commit(next: PosterCrop) {
    const clamped =
      sizeKnown && naturalRef.current.width > 0
        ? clampCrop(next, naturalRef.current.width, naturalRef.current.height)
        : { ...next, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)) };
    setDraft(clamped);
    onChange(clamped);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!frameRef.current) return;
    const box = frameRef.current.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...draft };

    const move = (moveEvent: PointerEvent) => {
      commit({
        ...origin,
        x: origin.x + (moveEvent.clientX - startX) / box.width,
        y: origin.y + (moveEvent.clientY - startY) / box.height,
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    event.preventDefault();
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
          <Icon name="image" className="h-3.5 w-3.5" /> Card crop · 676 × 451
        </p>
        <button
          type="button"
          onClick={() => commit({ ...DEFAULT_CROP, ar: draft.ar })}
          className="text-xs font-bold text-brand-blue hover:underline"
        >
          Reset framing
        </button>
      </div>

      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        className="relative mt-3 w-full cursor-grab touch-none select-none overflow-hidden rounded-lg bg-white active:cursor-grabbing"
        style={{ aspectRatio: "676 / 451" }}
      >
        <img
          src={imageUrl}
          alt="Poster framing preview"
          draggable={false}
          onLoad={(event) => {
            const width = event.currentTarget.naturalWidth;
            const height = event.currentTarget.naturalHeight;
            naturalRef.current = { width, height };
            setSizeKnown(true);
            // The poster's own shape is what lets a card reproduce this framing
            // at any width, so it is recorded even when nothing has been moved.
            if (width > 0 && height > 0 && draft.ar === undefined) {
              commit({ ...draft, ar: width / height });
            }
          }}
          className="max-w-none"
          style={posterCropStyle(draft)}
        />
        <div className="pointer-events-none absolute inset-0 border border-white/30" />
      </div>

      <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-ink-600">
        <span className="shrink-0">Zoom</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={draft.zoom}
          onChange={(event) => commit({ ...draft, zoom: Number(event.target.value) })}
          className="h-1.5 flex-1 accent-brand-blue"
          aria-label="Poster crop zoom"
        />
        <span className="w-10 shrink-0 tabular-nums text-ink-500">{draft.zoom.toFixed(2)}×</span>
      </label>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
        Drag inside the frame to reposition. The original poster is never cropped or re-uploaded —
        this framing is stored as numbers and applied wherever a card is shown.
      </p>
      {!cropIsDraggable(draft, naturalRef.current.width, naturalRef.current.height) && (
        <p className="mt-1 text-[11px] font-semibold text-ink-500">
          This poster already fills the card at this zoom, so there is nothing to reposition. Zoom in
          to move the framing.
        </p>
      )}
    </div>
  );
}
