import type { ModelSelection } from "@t3tools/contracts";

export const FORK_UPDATE_THREAD_TITLE = "Update fork";

export const FORK_UPDATE_PROMPT = `Review the upstream changes for this T3 Code fork before updating. Reply in Spanish.

Phase 1 — review only, do not modify anything:
1. Run \`git fetch upstream\` and list the missing commits with \`git log --oneline fork..upstream/main\`.
2. Summarize each commit in plain language: what changes for me as a user, fixes, and risky areas (data migrations, settings, desktop shell).
3. Check whether they conflict with the fork's own commits without touching the working tree, e.g. \`git merge-tree --write-tree --name-only fork upstream/main\`, and list any conflicting files.
4. Ask me whether to update, then stop and wait for my answer.

Phase 2 — only after I explicitly say yes:
1. Make sure the working tree has no uncommitted tracked changes.
2. Run \`scripts/update-fork.sh --install\`.
3. If the rebase stops on a conflict, resolve it preserving the fork's behavior, run \`git rebase --continue\`, then run \`scripts/update-fork.sh --install\` again.
4. At the end the app quits and reopens on the new build; that is expected.`;

export type ForkUpdateCheckState =
  | { readonly kind: "unknown" }
  | { readonly kind: "checking" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly aheadBy: number };

export function buildForkCompareUrl(baseSha: string): string {
  return `https://api.github.com/repos/pingdotgg/t3code/compare/${baseSha}...main?per_page=1`;
}

/** Returns null when the payload is not a compare response (rate limit, 404, ...). */
export function parseForkCompareResponse(
  payload: unknown,
): { readonly aheadBy: number; readonly htmlUrl: string } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { ahead_by: aheadBy, html_url: htmlUrl } = payload as Record<string, unknown>;
  if (typeof aheadBy !== "number" || !Number.isInteger(aheadBy) || aheadBy < 0) return null;
  if (typeof htmlUrl !== "string") return null;
  return { aheadBy, htmlUrl };
}

export function resolveForkUpdatePresentation(state: ForkUpdateCheckState): {
  readonly tooltip: string;
  readonly count: number | null;
  readonly highlighted: boolean;
  readonly action: "check" | "update" | "none";
} {
  switch (state.kind) {
    case "unknown":
      return {
        tooltip: "Check for upstream updates",
        count: null,
        highlighted: false,
        action: "check",
      };
    case "checking":
      return { tooltip: "Checking upstream…", count: null, highlighted: false, action: "none" };
    case "error":
      return {
        tooltip: "Could not check upstream. Click to retry",
        count: null,
        highlighted: false,
        action: "check",
      };
    case "ready":
      return state.aheadBy > 0
        ? {
            tooltip: `${state.aheadBy} upstream ${state.aheadBy === 1 ? "commit" : "commits"} to review. Click to start the update`,
            count: state.aheadBy,
            highlighted: true,
            action: "update",
          }
        : {
            tooltip: "Up to date with upstream. Click to re-check",
            count: null,
            highlighted: false,
            action: "check",
          };
  }
}

/** Mirrors a new thread's priority: the project/settings default, then the sticky pick. */
export function resolveForkUpdateModelSelection(input: {
  readonly projectDefault: ModelSelection | null;
  readonly sticky: ModelSelection | null;
}): ModelSelection | null {
  return input.projectDefault ?? input.sticky;
}
