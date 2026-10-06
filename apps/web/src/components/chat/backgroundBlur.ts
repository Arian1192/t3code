export const MAX_BACKGROUND_BLUR_PX = 24;

/** Maps a 0-100 blur percentage linearly to pixels (100% = 24px), clamping bad input. */
export function resolveBackgroundBlurPx(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  const clamped = Math.min(100, Math.max(0, percent));
  return (clamped / 100) * MAX_BACKGROUND_BLUR_PX;
}
