import { useClientSettings } from "~/hooks/useSettings";
import { resolveBackgroundImageUrl } from "~/lib/backgroundImageUrl";
import { BackgroundMediaLayer } from "./BackgroundMediaLayer";

/** User-chosen image behind the chat pane, dimmed with the theme background for legibility. */
export function ChatBackgroundLayer() {
  const rawUrl = useClientSettings((settings) => settings.chatBackgroundUrl);
  const dim = useClientSettings((settings) => settings.chatBackgroundDim);
  return (
    <BackgroundMediaLayer
      slot="chat-background"
      href={resolveBackgroundImageUrl(rawUrl)}
      dim={dim}
    />
  );
}
