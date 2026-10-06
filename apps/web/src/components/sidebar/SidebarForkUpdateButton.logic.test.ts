import { describe, expect, it } from "vite-plus/test";

import {
  FORK_UPDATE_PROMPT,
  FORK_UPDATE_THREAD_TITLE,
  buildForkCompareUrl,
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

  it("highlights the count and starts the update when behind", () => {
    expect(resolveForkUpdatePresentation({ kind: "ready", aheadBy: 3 })).toEqual({
      tooltip: "3 upstream commits to review. Click to start the update",
      count: 3,
      highlighted: true,
      action: "update",
    });
    expect(resolveForkUpdatePresentation({ kind: "ready", aheadBy: 1 }).tooltip).toBe(
      "1 upstream commit to review. Click to start the update",
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
