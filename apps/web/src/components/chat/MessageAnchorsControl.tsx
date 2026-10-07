import type { TimestampFormat } from "@t3tools/contracts/settings";
import { AnchorIcon, XIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { EMPTY_ANCHORS, useMessageAnchorStore } from "~/messageAnchorStore";
import { resolveVisibleAnchors } from "~/messageAnchors.logic";
import type { ChatMessage } from "../../types";
import { formatDayAwareTimestamp } from "../../timestampFormat";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

/** Header popover listing the thread's anchored messages; the trigger is hidden when there are none. */
export const MessageAnchorsControl = memo(function MessageAnchorsControl({
  threadKey,
  messages,
  timestampFormat,
  onJump,
}: {
  threadKey: string;
  messages: ReadonlyArray<ChatMessage>;
  timestampFormat: TimestampFormat;
  onJump: (messageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchors = useMessageAnchorStore(
    (state) => state.anchorsByThread[threadKey] ?? EMPTY_ANCHORS,
  );
  const visible = useMemo(() => resolveVisibleAnchors(anchors, messages), [anchors, messages]);

  if (visible.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={<span className="flex shrink-0" />}>
          <PopoverTrigger
            render={
              <Toggle
                className="shrink-0 [-webkit-app-region:no-drag]"
                pressed={open}
                aria-label="Anchored messages"
                variant="ghost"
                size="sm"
              />
            }
          >
            <AnchorIcon className="size-4" style={{ color: "var(--anchor-color)" }} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipPopup side="bottom">Anchored messages</TooltipPopup>
      </Tooltip>
      <PopoverPopup side="bottom" align="end" padding="compact" width="md">
        <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
          Anchored · {visible.length}
        </p>
        <ul className="flex max-h-80 flex-col overflow-y-auto" aria-label="Anchored messages">
          {visible.map((anchor) => (
            <li
              key={anchor.messageId}
              className="relative flex items-center gap-1 rounded-sm hover:bg-accent"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setOpen(false);
                  onJump(anchor.messageId);
                }}
              >
                <span className="w-9 shrink-0 text-2xs font-medium text-muted-foreground">
                  {anchor.role === "user" ? "You" : "Agent"}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground/85">{anchor.preview}</span>
                <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                  {formatDayAwareTimestamp(anchor.createdAt, timestampFormat)}
                </span>
              </button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Remove anchor"
                onClick={(event) => {
                  event.stopPropagation();
                  useMessageAnchorStore.getState().removeAnchor(threadKey, anchor.messageId);
                }}
              >
                <XIcon className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      </PopoverPopup>
    </Popover>
  );
});
