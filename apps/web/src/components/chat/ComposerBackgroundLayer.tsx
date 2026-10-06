import { useSyncExternalStore } from "react";

import { useClientSettings } from "~/hooks/useSettings";
import { cn } from "~/lib/utils";
import { resolveComposerBackgroundUrl } from "~/lib/composerBackground";

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

/** GIFs cannot be paused, so the layer is unmounted while hidden or under reduced motion. */
function useMotionAllowed() {
  return useSyncExternalStore(subscribeToMotionAllowance, getMotionAllowanceSnapshot, () => true);
}

/** User-chosen image rendered behind the composer glass. Renders nothing when off or invalid. */
export function ComposerBackgroundLayer({ className }: { className?: string | undefined }) {
  const rawUrl = useClientSettings((settings) => settings.composerBackgroundUrl);
  const motionAllowed = useMotionAllowed();
  const href = resolveComposerBackgroundUrl(rawUrl);
  if (href === null || !motionAllowed) return null;
  return (
    <div
      aria-hidden="true"
      data-slot="composer-background"
      className={cn(
        "pointer-events-none absolute inset-0 -z-1 overflow-hidden rounded-3xl bg-cover bg-center",
        className,
      )}
      style={{ backgroundImage: `url(${JSON.stringify(href)})` }}
    />
  );
}
