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

export function buildForkCommitsUrl(baseSha: string): string {
  return `https://api.github.com/repos/pingdotgg/t3code/compare/${baseSha}...main?per_page=100`;
}

export interface ForkUpstreamCommit {
  readonly sha: string;
  readonly shortSha: string;
  readonly title: string;
  readonly author: string;
  readonly date: string | null;
  readonly htmlUrl: string;
}

function parseForkCommit(entry: unknown): ForkUpstreamCommit | null {
  if (typeof entry !== "object" || entry === null) return null;
  const { sha, html_url: htmlUrl, commit, author } = entry as Record<string, unknown>;
  if (typeof sha !== "string" || typeof htmlUrl !== "string") return null;
  if (typeof commit !== "object" || commit === null) return null;
  const { message, author: commitAuthor } = commit as Record<string, unknown>;
  if (typeof message !== "string") return null;
  const { name, date } = (
    typeof commitAuthor === "object" && commitAuthor !== null ? commitAuthor : {}
  ) as Record<string, unknown>;
  const login =
    typeof author === "object" && author !== null
      ? (author as Record<string, unknown>).login
      : undefined;
  return {
    sha,
    shortSha: sha.slice(0, 7),
    title: (message.split("\n")[0] ?? "").trim(),
    author:
      typeof name === "string" && name
        ? name
        : typeof login === "string" && login
          ? login
          : "unknown",
    date: typeof date === "string" ? date : null,
    htmlUrl,
  };
}

/** Commits come back newest first (GitHub lists them oldest first). */
export function parseForkCommitsResponse(payload: unknown): {
  readonly aheadBy: number;
  readonly htmlUrl: string;
  readonly commits: ReadonlyArray<ForkUpstreamCommit>;
} | null {
  const compare = parseForkCompareResponse(payload);
  if (!compare) return null;
  const rawCommits = (payload as Record<string, unknown>).commits;
  const commits: ForkUpstreamCommit[] = [];
  if (Array.isArray(rawCommits)) {
    for (const entry of rawCommits) {
      const commit = parseForkCommit(entry);
      if (commit) commits.unshift(commit);
    }
  }
  return { ...compare, commits };
}

export function resolveForkUpdatePresentation(state: ForkUpdateCheckState): {
  readonly tooltip: string;
  readonly count: number | null;
  readonly highlighted: boolean;
  readonly action: "check" | "open" | "none";
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
            tooltip: `${state.aheadBy} upstream ${state.aheadBy === 1 ? "commit" : "commits"}. Click to review`,
            count: state.aheadBy,
            highlighted: true,
            action: "open",
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
