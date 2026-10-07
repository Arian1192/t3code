import { describe, expect, it } from "vite-plus/test";

import {
  FORK_UPDATE_PROMPT,
  FORK_UPDATE_THREAD_TITLE,
  buildForkCommitsUrl,
  buildForkCompareUrl,
  parseForkCommitsResponse,
  parseForkCompareResponse,
  resolveForkUpdateModelSelection,
  resolveForkUpdatePresentation,
} from "./SidebarForkUpdateButton.logic";

describe("buildForkCompareUrl", () => {
  it("compares the merge-base against upstream main with a single commit page", () => {
    expect(buildForkCompareUrl("abc123")).toBe(
      "https://api.github.com/repos/pingdotgg/t3code/compare/abc123...main?per_page=1",
    );
  });
});

describe("buildForkCommitsUrl", () => {
  it("asks for up to 100 commits between the merge-base and upstream main", () => {
    expect(buildForkCommitsUrl("abc123")).toBe(
      "https://api.github.com/repos/pingdotgg/t3code/compare/abc123...main?per_page=100",
    );
  });
});

describe("parseForkCommitsResponse", () => {
  const commit = (sha: string, overrides: Record<string, unknown> = {}) => ({
    sha,
    html_url: `https://github.com/pingdotgg/t3code/commit/${sha}`,
    commit: {
      message: "fix: a thing\n\nbody text",
      author: { name: "Ada", date: "2026-10-01T10:00:00Z" },
    },
    author: { login: "ada-gh" },
    ...overrides,
  });
  const compare = (commits: unknown[]) => ({
    ahead_by: commits.length,
    html_url: "https://github.com/pingdotgg/t3code/compare/abc...main",
    commits,
  });

  it("returns commits newest first with short sha, first-line title and author", () => {
    const parsed = parseForkCommitsResponse(
      compare([commit("1111111aaaa"), commit("2222222bbbb")]),
    );
    expect(parsed?.aheadBy).toBe(2);
    expect(parsed?.htmlUrl).toBe("https://github.com/pingdotgg/t3code/compare/abc...main");
    expect(parsed?.commits.map((c) => c.sha)).toEqual(["2222222bbbb", "1111111aaaa"]);
    expect(parsed?.commits[0]).toEqual({
      sha: "2222222bbbb",
      shortSha: "2222222",
      title: "fix: a thing",
      author: "Ada",
      date: "2026-10-01T10:00:00Z",
      htmlUrl: "https://github.com/pingdotgg/t3code/commit/2222222bbbb",
    });
  });

  it("falls back to the login, then to unknown, and allows a missing date", () => {
    const parsed = parseForkCommitsResponse(
      compare([
        commit("aaaaaaa1", { commit: { message: "x", author: {} } }),
        commit("bbbbbbb2", { commit: { message: "y" }, author: null }),
      ]),
    );
    expect(parsed?.commits[0]).toMatchObject({ author: "unknown", date: null });
    expect(parsed?.commits[1]).toMatchObject({ author: "ada-gh", date: null });
  });

  it("skips malformed commit entries", () => {
    const parsed = parseForkCommitsResponse(
      compare([commit("aaaaaaa1"), null, { sha: 5 }, commit("bbbbbbb2", { html_url: undefined })]),
    );
    expect(parsed?.commits.map((c) => c.sha)).toEqual(["aaaaaaa1"]);
  });

  it("returns null when the payload is not a compare response", () => {
    expect(parseForkCommitsResponse({ message: "Not Found" })).toBeNull();
    expect(parseForkCommitsResponse(null)).toBeNull();
  });

  it("returns an empty list when commits is missing", () => {
    const parsed = parseForkCommitsResponse({ ahead_by: 2, html_url: "https://x" });
    expect(parsed).toEqual({ aheadBy: 2, htmlUrl: "https://x", commits: [] });
  });
});

describe("parseForkCompareResponse", () => {
  it("extracts the missing commit count and compare page", () => {
    expect(
      parseForkCompareResponse({
        ahead_by: 7,
        html_url: "https://github.com/pingdotgg/t3code/compare/abc...main",
        commits: [],
      }),
    ).toEqual({
      aheadBy: 7,
      htmlUrl: "https://github.com/pingdotgg/t3code/compare/abc...main",
    });
  });

  it("accepts zero commits ahead", () => {
    expect(parseForkCompareResponse({ ahead_by: 0, html_url: "https://x" })?.aheadBy).toBe(0);
  });

  it.each([
    null,
    "nope",
    {},
    { ahead_by: "3", html_url: "https://x" },
    { ahead_by: -1, html_url: "https://x" },
    { ahead_by: 1.5, html_url: "https://x" },
    { ahead_by: 2 },
    { message: "Not Found" },
  ])("rejects an invalid payload: %j", (payload) => {
    expect(parseForkCompareResponse(payload)).toBeNull();
  });
});

describe("resolveForkUpdatePresentation", () => {
  it("shows a dim icon while unknown", () => {
    expect(resolveForkUpdatePresentation({ kind: "unknown" })).toEqual({
      tooltip: "Check for upstream updates",
      count: null,
      highlighted: false,
      action: "check",
    });
  });

  it("blocks interaction while checking", () => {
    expect(resolveForkUpdatePresentation({ kind: "checking" })).toMatchObject({
      tooltip: "Checking upstream…",
      highlighted: false,
      action: "none",
    });
  });

  it("is dim and re-checks when up to date", () => {
    expect(resolveForkUpdatePresentation({ kind: "ready", aheadBy: 0 })).toEqual({
      tooltip: "Up to date with upstream. Click to re-check",
      count: null,
      highlighted: false,
      action: "check",
    });
  });

  it("highlights the count and opens the review popover when behind", () => {
    expect(resolveForkUpdatePresentation({ kind: "ready", aheadBy: 3 })).toEqual({
      tooltip: "3 upstream commits. Click to review",
      count: 3,
      highlighted: true,
      action: "open",
    });
    expect(resolveForkUpdatePresentation({ kind: "ready", aheadBy: 1 }).tooltip).toBe(
      "1 upstream commit. Click to review",
    );
  });

  it("re-checks after an error", () => {
    expect(resolveForkUpdatePresentation({ kind: "error" })).toMatchObject({
      tooltip: "Could not check upstream. Click to retry",
      highlighted: false,
      action: "check",
    });
  });
});

describe("resolveForkUpdateModelSelection", () => {
  const projectDefault = { instanceId: "codex", model: "a" } as never;
  const sticky = { instanceId: "claudeAgent", model: "b" } as never;

  it("prefers the project default over the sticky selection", () => {
    expect(resolveForkUpdateModelSelection({ projectDefault, sticky })).toBe(projectDefault);
  });

  it("falls back to the sticky selection", () => {
    expect(resolveForkUpdateModelSelection({ projectDefault: null, sticky })).toBe(sticky);
  });

  it("returns null when nothing is configured", () => {
    expect(resolveForkUpdateModelSelection({ projectDefault: null, sticky: null })).toBeNull();
  });
});

describe("fork update prompt", () => {
  it("titles the thread and asks for a review before updating", () => {
    expect(FORK_UPDATE_THREAD_TITLE).toBe("Update fork");
    expect(FORK_UPDATE_PROMPT).toContain("Reply in Spanish.");
    expect(FORK_UPDATE_PROMPT).toContain("git log --oneline fork..upstream/main");
    expect(FORK_UPDATE_PROMPT).toContain("scripts/update-fork.sh --install");
  });
});
