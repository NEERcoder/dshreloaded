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
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (parsed.pathname.includes("/shorts/")) {
      return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
    }
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
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
