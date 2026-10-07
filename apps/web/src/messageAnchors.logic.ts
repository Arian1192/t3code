import { normalizeProviderAccentColor } from "./providerInstances";
import type { ChatMessage } from "./types";

/** One anchored message in a thread; preview data is always derived from the live message. */
export interface MessageAnchor {
  readonly messageId: string;
  readonly anchoredAt: string;
}

export interface ResolvedMessageAnchor {
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly preview: string;
  readonly createdAt: string;
}

type AnchorSourceMessage = Pick<ChatMessage, "role" | "text" | "createdAt"> & {
  readonly id: string;
};

export const DEFAULT_ANCHOR_COLOR = "var(--primary)";

export function isMessageAnchorable(role: ChatMessage["role"]): boolean {
  return role === "user" || role === "assistant";
}

export function toggleMessageAnchor(
  anchors: ReadonlyArray<MessageAnchor>,
  messageId: string,
  now: string,
): MessageAnchor[] {
  return anchors.some((anchor) => anchor.messageId === messageId)
    ? anchors.filter((anchor) => anchor.messageId !== messageId)
    : [...anchors, { messageId, anchoredAt: now }];
}

/** First non-empty line, trimmed, so multiline payloads such as JSON still read as one row. */
export function anchorPreview(text: string): string {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

/** Anchors in timeline order, skipping messages that no longer exist or cannot be anchored. */
export function resolveVisibleAnchors(
  anchors: ReadonlyArray<MessageAnchor>,
  messages: ReadonlyArray<AnchorSourceMessage>,
): ResolvedMessageAnchor[] {
  if (anchors.length === 0) return [];
  const anchoredIds = new Set(anchors.map((anchor) => anchor.messageId));
  const resolved: ResolvedMessageAnchor[] = [];
  for (const message of messages) {
    if (!anchoredIds.has(message.id)) continue;
    if (message.role !== "user" && message.role !== "assistant") continue;
    resolved.push({
      messageId: message.id,
      role: message.role,
      preview: anchorPreview(message.text),
      createdAt: message.createdAt,
    });
  }
  return resolved;
}

/** Returns the same array when every anchor still has its message, so callers can skip writes. */
export function pruneAnchors(
  anchors: ReadonlyArray<MessageAnchor>,
  messageIds: ReadonlySet<string>,
): ReadonlyArray<MessageAnchor> {
  const kept = anchors.filter((anchor) => messageIds.has(anchor.messageId));
  return kept.length === anchors.length ? anchors : kept;
}

export function resolveAnchorColor(value: string | undefined): string {
  return normalizeProviderAccentColor(value) ?? DEFAULT_ANCHOR_COLOR;
}
