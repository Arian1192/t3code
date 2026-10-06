import { useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";
import { resolveBackgroundBlurPx } from "./backgroundBlur";

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
  blur,
  slot,
}: {
  href: string | null;
  className?: string | undefined;
  dim?: number | undefined;
  /** Blur percentage applied to the image only, never to the dim overlay. */
  blur?: number | undefined;
  slot: string;
}) {
  const motionAllowed = useMotionAllowed();
  if (href === null || !motionAllowed) return null;
  const blurPx = blur === undefined ? 0 : resolveBackgroundBlurPx(blur);
  const image = `url(${JSON.stringify(href)})`;
  return (
    <div
      aria-hidden="true"
      data-slot={slot}
      className={cn(
        "pointer-events-none absolute inset-0 -z-1 overflow-hidden",
        blurPx === 0 && "bg-cover bg-center",
        className,
      )}
      style={blurPx === 0 ? { backgroundImage: image } : undefined}
    >
      {blurPx === 0 ? null : (
        // Extend past the bounds so the blur's faded edges fall outside the clipped wrapper.
        <div
          className="absolute bg-cover bg-center"
          style={{
            backgroundImage: image,
            filter: `blur(${blurPx}px)`,
            inset: `${-2 * blurPx}px`,
          }}
        />
      )}
      {dim === undefined ? null : (
        <div className="absolute inset-0 bg-background" style={{ opacity: dim / 100 }} />
      )}
    </div>
  );
}
