import { beforeEach, describe, expect, it } from "vite-plus/test";

import { migrateMessageAnchorState, useMessageAnchorStore } from "./messageAnchorStore";

const KEY = "env-1:thread-1";

const anchorIds = () =>
  useMessageAnchorStore.getState().anchorsByThread[KEY]?.map((anchor) => anchor.messageId);

beforeEach(() => {
  useMessageAnchorStore.setState({ anchorsByThread: {} });
});

describe("messageAnchorStore", () => {
  it("toggles an anchor on and off per thread", () => {
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    expect(anchorIds()).toEqual(["m1"]);
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    expect(useMessageAnchorStore.getState().anchorsByThread[KEY]).toBeUndefined();
  });

  it("keeps threads separate", () => {
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    useMessageAnchorStore.getState().toggleAnchor("env-2:thread-1", "m1");
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    expect(useMessageAnchorStore.getState().anchorsByThread).toEqual({
      "env-2:thread-1": [expect.objectContaining({ messageId: "m1" })],
    });
  });

  it("removeAnchor removes only that message", () => {
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m2");
    useMessageAnchorStore.getState().removeAnchor(KEY, "m1");
    expect(anchorIds()).toEqual(["m2"]);
  });

  it("pruneThread drops missing messages and keeps state identity when nothing changes", () => {
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    const before = useMessageAnchorStore.getState().anchorsByThread;
    useMessageAnchorStore.getState().pruneThread(KEY, new Set(["m1"]));
    expect(useMessageAnchorStore.getState().anchorsByThread).toBe(before);
    useMessageAnchorStore.getState().pruneThread(KEY, new Set());
    expect(useMessageAnchorStore.getState().anchorsByThread[KEY]).toBeUndefined();
  });
});

describe("messageAnchorStore labels", () => {
  it("renameAnchor stores and clears a label", () => {
    useMessageAnchorStore.getState().toggleAnchor(KEY, "m1");
    useMessageAnchorStore.getState().renameAnchor(KEY, "m1", "Sample JSON");
    expect(useMessageAnchorStore.getState().anchorsByThread[KEY]?.[0]?.label).toBe("Sample JSON");
    useMessageAnchorStore.getState().renameAnchor(KEY, "m1", "");
    expect(useMessageAnchorStore.getState().anchorsByThread[KEY]?.[0]).not.toHaveProperty("label");
  });
});

describe("migrateMessageAnchorState", () => {
  it("keeps string labels and drops other label values", () => {
    expect(
      migrateMessageAnchorState({
        anchorsByThread: {
          [KEY]: [
            { messageId: "m1", anchoredAt: "t", label: "Plan" },
            { messageId: "m2", anchoredAt: "t", label: 42 },
          ],
        },
      }),
    ).toEqual({
      anchorsByThread: {
        [KEY]: [
          { messageId: "m1", anchoredAt: "t", label: "Plan" },
          { messageId: "m2", anchoredAt: "t" },
        ],
      },
    });
  });

  it("migrate rejects malformed payload", () => {
    expect(migrateMessageAnchorState(null)).toEqual({ anchorsByThread: {} });
    expect(migrateMessageAnchorState({ anchorsByThread: "nope" })).toEqual({
      anchorsByThread: {},
    });
    expect(
      migrateMessageAnchorState({
        anchorsByThread: {
          [KEY]: [{ messageId: "m1", anchoredAt: "t" }, { bad: true }],
          other: "nope",
        },
      }),
    ).toEqual({ anchorsByThread: { [KEY]: [{ messageId: "m1", anchoredAt: "t" }] } });
  });
});
