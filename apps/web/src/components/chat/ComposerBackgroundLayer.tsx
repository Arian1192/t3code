import { useClientSettings } from "~/hooks/useSettings";
import { resolveBackgroundImageUrl } from "~/lib/backgroundImageUrl";
import { cn } from "~/lib/utils";
import { BackgroundMediaLayer } from "./BackgroundMediaLayer";

/** User-chosen image rendered behind the composer glass. Renders nothing when off or invalid. */
export function ComposerBackgroundLayer({ className }: { className?: string | undefined }) {
  const rawUrl = useClientSettings((settings) => settings.composerBackgroundUrl);
  return (
    <BackgroundMediaLayer
      slot="composer-background"
      href={resolveBackgroundImageUrl(rawUrl)}
      className={cn("rounded-3xl", className)}
    />
  );
}
