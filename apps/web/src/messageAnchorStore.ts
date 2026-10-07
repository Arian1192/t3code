import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "./lib/storage";
import {
  type MessageAnchor,
  pruneAnchors,
  renameMessageAnchor,
  toggleMessageAnchor,
} from "./messageAnchors.logic";

/** Message anchors live on this device only, keyed by `scopedThreadKey(threadRef)`. */
interface MessageAnchorStoreState {
  readonly anchorsByThread: Readonly<Record<string, ReadonlyArray<MessageAnchor>>>;
  readonly toggleAnchor: (threadKey: string, messageId: string) => void;
  readonly removeAnchor: (threadKey: string, messageId: string) => void;
  readonly renameAnchor: (threadKey: string, messageId: string, label: string) => void;
  /** Drops anchors whose message is gone; leaves state untouched when nothing changes. */
  readonly pruneThread: (threadKey: string, messageIds: ReadonlySet<string>) => void;
}

export const EMPTY_ANCHORS: ReadonlyArray<MessageAnchor> = [];

function withThreadAnchors(
  anchorsByThread: MessageAnchorStoreState["anchorsByThread"],
  threadKey: string,
  anchors: ReadonlyArray<MessageAnchor>,
) {
  const next = { ...anchorsByThread };
  if (anchors.length === 0) delete next[threadKey];
  else next[threadKey] = anchors;
  return next;
}

function isMessageAnchor(value: unknown): value is MessageAnchor {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Record<keyof MessageAnchor, unknown>>;
  return typeof candidate.messageId === "string" && typeof candidate.anchoredAt === "string";
}

/** Keeps only well-formed entries so a corrupt localStorage payload never breaks the chat. */
export function migrateMessageAnchorState(persisted: unknown): {
  anchorsByThread: Record<string, MessageAnchor[]>;
} {
  const raw = (persisted as { anchorsByThread?: unknown } | null)?.anchorsByThread;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { anchorsByThread: {} };
  }
  const anchorsByThread: Record<string, MessageAnchor[]> = {};
  for (const [threadKey, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    const anchors = value
      .filter(isMessageAnchor)
      .map(({ messageId, anchoredAt, label }) =>
        typeof label === "string" && label.length > 0
          ? { messageId, anchoredAt, label }
          : { messageId, anchoredAt },
      );
    if (anchors.length > 0) anchorsByThread[threadKey] = anchors;
  }
  return { anchorsByThread };
}

export const useMessageAnchorStore = create<MessageAnchorStoreState>()(
  persist(
    (set, get) => ({
      anchorsByThread: {},
      toggleAnchor: (threadKey, messageId) =>
        set((state) => ({
          anchorsByThread: withThreadAnchors(
            state.anchorsByThread,
            threadKey,
            toggleMessageAnchor(
              state.anchorsByThread[threadKey] ?? EMPTY_ANCHORS,
              messageId,
              new Date().toISOString(),
            ),
          ),
        })),
      removeAnchor: (threadKey, messageId) =>
        set((state) => ({
          anchorsByThread: withThreadAnchors(
            state.anchorsByThread,
            threadKey,
            (state.anchorsByThread[threadKey] ?? EMPTY_ANCHORS).filter(
              (anchor) => anchor.messageId !== messageId,
            ),
          ),
        })),
      renameAnchor: (threadKey, messageId, label) => {
        const current = get().anchorsByThread[threadKey];
        if (!current) return;
        const renamed = renameMessageAnchor(current, messageId, label);
        if (renamed === current) return;
        set((state) => ({
          anchorsByThread: withThreadAnchors(state.anchorsByThread, threadKey, renamed),
        }));
      },
      pruneThread: (threadKey, messageIds) => {
        const current = get().anchorsByThread[threadKey];
        if (!current) return;
        const pruned = pruneAnchors(current, messageIds);
        if (pruned === current) return;
        set((state) => ({
          anchorsByThread: withThreadAnchors(state.anchorsByThread, threadKey, pruned),
        }));
      },
    }),
    {
      name: "t3code:message-anchors:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      version: 1,
      migrate: (persisted) => migrateMessageAnchorState(persisted),
      // Validate on every hydrate, not only on version changes.
      merge: (persisted, current) => ({ ...current, ...migrateMessageAnchorState(persisted) }),
      partialize: ({ anchorsByThread }) => ({ anchorsByThread }),
    },
  ),
);
