import { describe, expect, it } from "vite-plus/test";
import {
  anchorPreview,
  isMessageAnchorable,
  MAX_ANCHOR_LABEL_LENGTH,
  pruneAnchors,
  renameMessageAnchor,
  resolveAnchorColor,
  resolveVisibleAnchors,
  toggleMessageAnchor,
} from "./messageAnchors.logic";

const msg = (id: string, role: "user" | "assistant" | "system", text: string, t: number) => ({
  id,
  role,
  text,
  createdAt: new Date(t * 1000).toISOString(),
});

describe("toggleMessageAnchor", () => {
  it("adds then removes an anchor", () => {
    const added = toggleMessageAnchor([], "m1", "2026-10-07T00:00:00.000Z");
    expect(added).toEqual([{ messageId: "m1", anchoredAt: "2026-10-07T00:00:00.000Z" }]);
    expect(toggleMessageAnchor(added, "m1", "later")).toEqual([]);
  });
});

describe("isMessageAnchorable", () => {
  it("allows user and assistant, rejects system", () => {
    expect(isMessageAnchorable("user")).toBe(true);
    expect(isMessageAnchorable("assistant")).toBe(true);
    expect(isMessageAnchorable("system")).toBe(false);
  });
});

describe("resolveVisibleAnchors", () => {
  const messages = [
    msg("a", "user", "first", 1),
    msg("b", "assistant", "second", 2),
    msg("c", "user", "third", 3),
  ];

  it("orders by timeline, not by anchor time", () => {
    const anchors = [
      { messageId: "c", anchoredAt: "1" },
      { messageId: "a", anchoredAt: "2" },
    ];
    expect(resolveVisibleAnchors(anchors, messages).map((a) => a.messageId)).toEqual(["a", "c"]);
  });

  it("hides anchors whose message is gone and system messages", () => {
    const anchors = [
      { messageId: "zzz", anchoredAt: "1" },
      { messageId: "b", anchoredAt: "2" },
      { messageId: "s", anchoredAt: "3" },
    ];
    const resolved = resolveVisibleAnchors(anchors, [...messages, msg("s", "system", "x", 4)]);
    expect(resolved).toEqual([
      {
        messageId: "b",
        role: "assistant",
        preview: "second",
        label: null,
        createdAt: messages[1]!.createdAt,
      },
    ]);
  });
});

describe("pruneAnchors", () => {
  it("drops anchors whose message is gone", () => {
    const anchors = [
      { messageId: "a", anchoredAt: "1" },
      { messageId: "gone", anchoredAt: "2" },
    ];
    expect(pruneAnchors(anchors, new Set(["a"]))).toEqual([{ messageId: "a", anchoredAt: "1" }]);
  });

  it("returns the same reference when nothing changes", () => {
    const anchors = [{ messageId: "a", anchoredAt: "1" }];
    expect(pruneAnchors(anchors, new Set(["a"]))).toBe(anchors);
  });
});

describe("anchorPreview", () => {
  it("first non-empty line preview", () => {
    expect(anchorPreview('\n\n   {\n  "a": 1\n}')).toBe("{");
    expect(anchorPreview("  hello world  \nmore")).toBe("hello world");
    expect(anchorPreview("   \n  ")).toBe("");
  });
});

describe("resolveAnchorColor", () => {
  it("uses a valid hex", () => {
    expect(resolveAnchorColor("#ff00aa")).toBe("#ff00aa");
  });

  it("resolveAnchorColor falls back for empty and invalid", () => {
    expect(resolveAnchorColor(undefined)).toBe("var(--primary)");
    expect(resolveAnchorColor("")).toBe("var(--primary)");
    expect(resolveAnchorColor("red")).toBe("var(--primary)");
  });
});

describe("renameMessageAnchor", () => {
  const anchors = [
    { messageId: "a", anchoredAt: "1" },
    { messageId: "b", anchoredAt: "2" },
  ];

  it("sets a trimmed label on one anchor only", () => {
    expect(renameMessageAnchor(anchors, "a", "  Sample JSON  ")).toEqual([
      { messageId: "a", anchoredAt: "1", label: "Sample JSON" },
      { messageId: "b", anchoredAt: "2" },
    ]);
  });

  it("clears the label when it is blank", () => {
    const labelled = renameMessageAnchor(anchors, "a", "x");
    expect(renameMessageAnchor(labelled, "a", "   ")).toEqual(anchors);
  });

  it("caps the label length", () => {
    const [first] = renameMessageAnchor(anchors, "a", "x".repeat(200));
    expect(first?.label).toHaveLength(MAX_ANCHOR_LABEL_LENGTH);
  });

  it("returns the same array for an unknown message", () => {
    expect(renameMessageAnchor(anchors, "zzz", "x")).toBe(anchors);
  });
});

describe("resolveVisibleAnchors labels", () => {
  it("exposes the label, or null when unnamed", () => {
    const messages = [msg("a", "user", "first", 1), msg("b", "assistant", "second", 2)];
    const resolved = resolveVisibleAnchors(
      [
        { messageId: "a", anchoredAt: "1", label: "Plan" },
        { messageId: "b", anchoredAt: "2" },
      ],
      messages,
    );
    expect(resolved.map((anchor) => [anchor.label, anchor.preview])).toEqual([
      ["Plan", "first"],
      [null, "second"],
    ]);
  });
});
