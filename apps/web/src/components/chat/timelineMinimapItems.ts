import type { MessagesTimelineRow } from "./MessagesTimeline.logic";

export interface TimelineMinimapItem {
  readonly id: string;
  readonly rowIndex: number;
  readonly userText: string | null;
  readonly assistantText: string | null;
  /** Row of the first anchored message in this turn; the minimap jumps there instead of the prompt. */
  readonly anchoredRowIndex: number | null;
}

const EMPTY_ANCHORED_IDS: ReadonlySet<string> = new Set();

/** Keep full source text untouched until a minimap preview is opened. */
export function deriveTimelineMinimapItems(
  rows: ReadonlyArray<MessagesTimelineRow>,
  anchoredMessageIds: ReadonlySet<string> = EMPTY_ANCHORED_IDS,
): TimelineMinimapItem[] {
  const items: TimelineMinimapItem[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row?.kind !== "message" || row.message.role !== "user") {
      continue;
    }

    items.push({
      id: row.id,
      rowIndex: index,
      userText: row.message.text,
      assistantText: resolveFinalAssistantTextForTurn(rows, index),
      anchoredRowIndex: resolveAnchoredRowIndexForTurn(rows, index, anchoredMessageIds),
    });
  }
  return items;
}

function resolveFinalAssistantTextForTurn(
  rows: ReadonlyArray<MessagesTimelineRow>,
  userRowIndex: number,
) {
  let finalAssistantText: string | null = null;
  for (let index = userRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row?.kind !== "message") {
      continue;
    }
    if (row.message.role === "user") {
      break;
    }
    if (row.message.role === "assistant") {
      finalAssistantText = row.message.text ?? null;
    }
  }
  return finalAssistantText;
}

function resolveAnchoredRowIndexForTurn(
  rows: ReadonlyArray<MessagesTimelineRow>,
  userRowIndex: number,
  anchoredMessageIds: ReadonlySet<string>,
): number | null {
  if (anchoredMessageIds.size === 0) return null;
  for (let index = userRowIndex; index < rows.length; index += 1) {
    const row = rows[index];
    if (row?.kind !== "message") continue;
    if (index > userRowIndex && row.message.role === "user") break;
    if (anchoredMessageIds.has(row.message.id)) return index;
  }
  return null;
}

function compactMinimapPreview(text: string | null | undefined) {
  const compact = text?.replace(/\s+/g, " ").trim() ?? "";
  return compact.length > 0 ? compact : null;
}

export function resolveTimelineMinimapPreview(
  item: TimelineMinimapItem | null,
): TimelineMinimapItem | null {
  return item === null
    ? null
    : {
        ...item,
        userText: compactMinimapPreview(item.userText),
        assistantText: compactMinimapPreview(item.assistantText),
      };
}
