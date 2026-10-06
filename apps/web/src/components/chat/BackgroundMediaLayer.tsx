import { useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionAllowance(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function getMotionAllowanceSnapshot() {
  return document.visibilityState !== "hidden" && !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** GIFs cannot be paused, so layers are unmounted while hidden or under reduced motion. */
export function useMotionAllowed() {
  return useSyncExternalStore(subscribeToMotionAllowance, getMotionAllowanceSnapshot, () => true);
}

/**
 * Decorative image layer. `href` must come from `resolveBackgroundImageUrl`; `dim` optionally
 * covers the image with the theme background at that percentage so content stays legible.
 */
export function BackgroundMediaLayer({
  href,
  className,
  dim,
  slot,
}: {
  href: string | null;
  className?: string | undefined;
  dim?: number | undefined;
  slot: string;
}) {
  const motionAllowed = useMotionAllowed();
  if (href === null || !motionAllowed) return null;
  return (
    <div
      aria-hidden="true"
      data-slot={slot}
      className={cn(
        "pointer-events-none absolute inset-0 -z-1 overflow-hidden bg-cover bg-center",
        className,
      )}
      style={{ backgroundImage: `url(${JSON.stringify(href)})` }}
    >
      {dim === undefined ? null : (
        <div className="absolute inset-0 bg-background" style={{ opacity: dim / 100 }} />
      )}
    </div>
  );
}
