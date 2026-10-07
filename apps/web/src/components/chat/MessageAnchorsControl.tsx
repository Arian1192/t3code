import type { TimestampFormat } from "@t3tools/contracts/settings";
import { AnchorIcon, PencilIcon, XIcon } from "lucide-react";
import { memo, useMemo, useRef, useState } from "react";
import { EMPTY_ANCHORS, useMessageAnchorStore } from "~/messageAnchorStore";
import { MAX_ANCHOR_LABEL_LENGTH, resolveVisibleAnchors } from "~/messageAnchors.logic";
import type { ChatMessage } from "../../types";
import { formatDayAwareTimestamp } from "../../timestampFormat";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

/** Inline label editor: Enter or blur saves, Escape cancels without closing the popover. */
function AnchorLabelInput({
  initialValue,
  placeholder,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  placeholder: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const cancelledRef = useRef(false);
  return (
    <Input
      aria-label="Anchor name"
      size="compact"
      className="min-w-0 flex-1"
      autoFocus
      defaultValue={initialValue}
      placeholder={placeholder}
      maxLength={MAX_ANCHOR_LABEL_LENGTH}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (cancelledRef.current) return;
        onCommit(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        // Keep Enter/Escape from reaching the popover's dismiss handling.
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancelledRef.current = true;
          onCancel();
        }
      }}
    />
  );
}

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const anchors = useMessageAnchorStore(
    (state) => state.anchorsByThread[threadKey] ?? EMPTY_ANCHORS,
  );
  const visible = useMemo(() => resolveVisibleAnchors(anchors, messages), [anchors, messages]);

  if (visible.length === 0) {
    // The control stays mounted while hidden, so a stale `open` must not reopen it on the next anchor.
    if (open) setOpen(false);
    if (editingMessageId !== null) setEditingMessageId(null);
    return null;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditingMessageId(null);
      }}
    >
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
              {editingMessageId === anchor.messageId ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">
                  <span className="w-9 shrink-0 text-2xs font-medium text-muted-foreground">
                    {anchor.role === "user" ? "You" : "Agent"}
                  </span>
                  <AnchorLabelInput
                    initialValue={anchor.label ?? ""}
                    placeholder={anchor.preview}
                    onCommit={(value) => {
                      useMessageAnchorStore
                        .getState()
                        .renameAnchor(threadKey, anchor.messageId, value);
                      setEditingMessageId(null);
                    }}
                    onCancel={() => setEditingMessageId(null)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setOpen(false);
                    onJump(anchor.messageId);
                  }}
                  onDoubleClick={() => setEditingMessageId(anchor.messageId)}
                >
                  <span className="w-9 shrink-0 text-2xs font-medium text-muted-foreground">
                    {anchor.role === "user" ? "You" : "Agent"}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-foreground/85">
                      {anchor.label ?? anchor.preview}
                    </span>
                    {anchor.label ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {anchor.preview}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                    {formatDayAwareTimestamp(anchor.createdAt, timestampFormat)}
                  </span>
                </button>
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Rename anchor"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingMessageId(anchor.messageId);
                }}
              >
                <PencilIcon className="size-3" />
              </Button>
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
