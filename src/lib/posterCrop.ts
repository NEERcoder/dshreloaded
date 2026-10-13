import type { CSSProperties } from "react";
import type { PosterCrop } from "./localProvider";

/**
 * Competition cards are laid out at 676 × 451, and the crop is expressed as
 * geometry over the *original* poster rather than a rewritten image. The upload
 * stays byte-for-byte intact so the detail page can keep presenting it whole,
 * while a card renders this crop over it.
 */
export const POSTER_CARD_WIDTH = 676;
export const POSTER_CARD_HEIGHT = 451;
export const POSTER_CARD_ASPECT = POSTER_CARD_WIDTH / POSTER_CARD_HEIGHT;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** The stored default: the framing a card falls back to when nothing is saved. */
export const DEFAULT_CROP: PosterCrop = { x: 0, y: 0, zoom: 1 };

function zoomOf(crop: PosterCrop): number {
  return clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
}

/**
 * How far the crop may be dragged before the card would show empty space.
 *
 * The image is drawn at the smallest size that still covers the frame, so only
 * the axis that overflows can be panned — a portrait poster slides up and down,
 * never sideways, and at zoom 1 there is nothing left to move on the other axis.
 * Offsets are fractions of the frame, which is what makes them resolution free.
 */
export function panLimits(naturalWidth: number, naturalHeight: number, zoom: number) {
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  if (naturalWidth <= 0 || naturalHeight <= 0) return { x: 0, y: 0 };
  const aspect = naturalWidth / naturalHeight;
  const widthRatio = Math.max(1, aspect / POSTER_CARD_ASPECT);
  const heightRatio = Math.max(1, POSTER_CARD_ASPECT / aspect);
  return {
    x: Math.max(0, (widthRatio * safeZoom - 1) / 2),
    y: Math.max(0, (heightRatio * safeZoom - 1) / 2),
  };
}

/** Keeps a crop inside what the card can actually show. */
export function clampCrop(crop: PosterCrop, naturalWidth: number, naturalHeight: number): PosterCrop {
  const zoom = zoomOf(crop);
  const limits = panLimits(naturalWidth, naturalHeight, zoom);
  const round = (value: number) => Number(value.toFixed(4));
  return {
    x: round(clamp(crop.x, -limits.x, limits.x)),
    y: round(clamp(crop.y, -limits.y, limits.y)),
    zoom,
    ar:
      naturalWidth > 0 && naturalHeight > 0
        ? Number((naturalWidth / naturalHeight).toFixed(4))
        : crop.ar,
  };
}

/** True once the crop knows the poster's own shape and can be positioned exactly. */
function hasGeometry(crop: PosterCrop): boolean {
  return typeof crop.ar === "number" && Number.isFinite(crop.ar) && crop.ar > 0;
}

/**
 * CSS for the image inside a `position: relative` frame.
 *
 * With a saved aspect ratio the image is sized to overflow the frame on exactly
 * one axis and offset by the pan, which is what lets a tall poster be slid
 * vertically inside a wide card without ever showing a gap. Without one — a
 * listing saved before this feature, or one whose poster has since been
 * replaced — the plain cover crop is used, so nothing looks broken.
 */
export function posterCropStyle(crop: PosterCrop | null | undefined): CSSProperties {
  const base: CSSProperties = { position: "absolute", inset: 0 };
  if (!crop) return { ...base, width: "100%", height: "100%", objectFit: "cover" };
  if (!hasGeometry(crop)) {
    // The poster's shape is unknown here, so it is covered the way a browser
    // covers any image and the pan is read as an object-position instead.
    return {
      ...base,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${(0.5 + clamp(crop.x, -0.5, 0.5)) * 100}% ${(0.5 + clamp(crop.y, -0.5, 0.5)) * 100}%`,
    };
  }
  const zoom = zoomOf(crop);
  const widthRatio = Math.max(1, crop.ar! / POSTER_CARD_ASPECT) * zoom;
  const heightRatio = Math.max(1, POSTER_CARD_ASPECT / crop.ar!) * zoom;
  return {
    position: "absolute",
    inset: undefined,
    width: `${widthRatio * 100}%`,
    height: `${heightRatio * 100}%`,
    left: `${((1 - widthRatio) / 2 + crop.x) * 100}%`,
    top: `${((1 - heightRatio) / 2 + crop.y) * 100}%`,
    // The box already carries the image's own aspect ratio, so filling it is
    // neither a stretch nor a crop.
    objectFit: "fill",
  };
}

/** Whether a stored crop is precise enough to be dragged at all. */
export function cropIsDraggable(crop: PosterCrop, naturalWidth: number, naturalHeight: number): boolean {
  const limits = panLimits(naturalWidth, naturalHeight, zoomOf(crop));
  return limits.x > 0 || limits.y > 0;
}
