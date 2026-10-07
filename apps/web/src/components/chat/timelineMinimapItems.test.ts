import { describe, expect, it } from "vite-plus/test";
import { MessageId } from "@t3tools/contracts";
import type { MessagesTimelineRow } from "./MessagesTimeline.logic";
import { deriveTimelineMinimapItems } from "./timelineMinimapItems";
import type { ChatMessage } from "../../types";

function rows(
  entries: ReadonlyArray<readonly ["user" | "assistant", string]>,
): MessagesTimelineRow[] {
  const messages: ChatMessage[] = entries.map(([role, text], index) => ({
    id: MessageId.make(`message-${index}`),
    role,
    text,
    streaming: false,
    runId: null,
    createdAt: new Date(index * 1000).toISOString(),
    updatedAt: new Date(index * 1000).toISOString(),
  }));
  return messages.map((message) => ({
    kind: "message",
    id: message.id,
    createdAt: message.createdAt,
    message,
    durationStart: message.createdAt,
    showAssistantMeta: false,
    showAssistantCopyButton: false,
    assistantCopyStreaming: false,
  }));
}

describe("timeline minimap anchors", () => {
  it("flags nothing without anchors", () => {
    const items = deriveTimelineMinimapItems(
      rows([
        ["user", "a"],
        ["assistant", "b"],
      ]),
    );
    expect(items.map((item) => item.anchoredRowIndex)).toEqual([null]);
  });

  it("anchored user message flags its own row", () => {
    const source = rows([
      ["user", "a"],
      ["assistant", "b"],
      ["user", "c"],
    ]);
    const items = deriveTimelineMinimapItems(source, new Set(["message-2"]));
    expect(items.map((item) => item.anchoredRowIndex)).toEqual([null, 2]);
  });

  it("anchored assistant message flags its turn and targets its row", () => {
    const source = rows([
      ["user", "a"],
      ["assistant", "b"],
      ["assistant", "c"],
      ["user", "d"],
    ]);
    const items = deriveTimelineMinimapItems(source, new Set(["message-2"]));
    expect(items.map((item) => item.anchoredRowIndex)).toEqual([2, null]);
  });
});

describe("timeline minimap anchor labels", () => {
  it("carries the label of the anchored message in the turn", () => {
    const source = rows([
      ["user", "a"],
      ["assistant", "b"],
      ["user", "c"],
    ]);
    const items = deriveTimelineMinimapItems(
      source,
      new Set(["message-1", "message-2"]),
      new Map([["message-1", "Sample JSON"]]),
    );
    expect(items.map((item) => item.anchorLabel)).toEqual(["Sample JSON", null]);
  });

  it("has no label without anchors", () => {
    const items = deriveTimelineMinimapItems(rows([["user", "a"]]));
    expect(items[0]?.anchorLabel).toBeNull();
  });
});
