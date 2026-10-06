/**
 * Validates a user-entered background image URL. Only `http:` and `https:` URLs are accepted;
 * the normalized `href` is returned so callers never use raw input in CSS.
 */
export function resolveBackgroundImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
