/**
 * URL Safety utilities for external links and YouTube media.
 * Prevents javascript:, data:, vbscript:, file:, blob: and other malicious schemes.
 */

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export function sanitizeExternalUrl(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Disallow explicit script or data URI attempts even if obfuscated
  if (/^(?:javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}

export function isSafeExternalUrl(rawUrl: string | null | undefined): boolean {
  return sanitizeExternalUrl(rawUrl) !== undefined;
}

/**
 * A WhatsApp click-to-chat link from whatever an admin typed.
 *
 * Numbers arrive as "+91 98765 43210", "9876543210" or "098765 43210" and all
 * have to become bare digits, because wa.me rejects punctuation and a link with
 * no country code does not resolve. Anything that will not reduce to 10–15
 * digits returns undefined, so the UI omits the button instead of shipping a
 * broken one.
 */
export function sanitizeWhatsAppUrl(rawNumber: string | null | undefined): string | undefined {
  if (!rawNumber) return undefined;
  let digits = rawNumber.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return undefined;
  return `https://wa.me/${digits}`;
}

/** A `mailto:` from an address field, or undefined when it is not an address. */
export function sanitizeMailto(rawEmail: string | null | undefined): string | undefined {
  if (!rawEmail) return undefined;
  const trimmed = rawEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return undefined;
  return `mailto:${trimmed.toLowerCase()}`;
}

/**
 * Validates and sanitizes YouTube URLs specifically.
 * Accepts youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...
 */
export function sanitizeYouTubeUrl(rawUrl: string | null | undefined): string | undefined {
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) return undefined;

  try {
    const parsed = new URL(safe);
    const host = parsed.hostname.toLowerCase();
    const isYouTubeHost =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "www.youtu.be";

    if (!isYouTubeHost) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Extracts YouTube video ID for safe thumbnail generation.
 */
export function extractYouTubeVideoId(rawUrl: string | null | undefined): string | null {
  const safe = sanitizeYouTubeUrl(rawUrl);
  if (!safe) return null;

  try {
    const parsed = new URL(safe);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const id = parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be"
      ? segments[0]
      : ["shorts", "embed", "live"].includes(segments[0])
        ? segments[1]
        : parsed.searchParams.get("v");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(youtubeUrl: string | null | undefined): string | undefined {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
}

export function getYouTubeThumbnailUrl(youtubeUrl: string | null | undefined, customThumbnail?: string | null): string | null {
  if (customThumbnail && isSafeExternalUrl(customThumbnail)) {
    return customThumbnail;
  }
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return null;
}
