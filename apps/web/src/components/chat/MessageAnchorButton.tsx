import { AnchorIcon } from "lucide-react";
import { memo } from "react";
import { useMessageAnchorStore } from "~/messageAnchorStore";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

/** Toggles a message anchor; the anchored colour comes from `--anchor-color`, set by ChatView. */
export const MessageAnchorButton = memo(function MessageAnchorButton({
  threadKey,
  messageId,
  anchored,
}: {
  threadKey: string;
  messageId: string;
  anchored: boolean;
}) {
  const label = anchored ? "Remove anchor" : "Anchor message";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="xs"
            variant="ghost-muted"
            aria-label={label}
            onClick={() => useMessageAnchorStore.getState().toggleAnchor(threadKey, messageId)}
          />
        }
      >
        <AnchorIcon
          className="size-3"
          style={anchored ? { color: "var(--anchor-color)" } : undefined}
        />
      </TooltipTrigger>
      <TooltipPopup side="top">{label}</TooltipPopup>
    </Tooltip>
  );
});
