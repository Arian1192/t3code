import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  settlePromise,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useOpenLink } from "../../browser/useOpenLink";
import { useComposerDraftStore } from "../../composerDraftStore";
import { isElectron } from "../../env";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { findProjectByPath } from "../../lib/projectPaths";
import { cn, newMessageId, newThreadId } from "../../lib/utils";
import { environmentServerConfigsAtom } from "../../state/server";
import { useProjects } from "../../state/entities";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { waitForStartedServerThread } from "../ChatView.logic";
import { resolveThreadRouteRef } from "../../threadRoutes";
import { formatRelativeTimeLabel } from "../../timestampFormat";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { SidebarMenuItem } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  FORK_UPDATE_PROMPT,
  FORK_UPDATE_THREAD_TITLE,
  type ForkUpdateCheckState,
  type ForkUpstreamCommit,
  buildForkCommitsUrl,
  buildForkCompareUrl,
  parseForkCommitsResponse,
  parseForkCompareResponse,
  resolveForkUpdateModelSelection,
  resolveForkUpdatePresentation,
} from "./SidebarForkUpdateButton.logic";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const reportError = (title: string, description: string) =>
  toastManager.add(stackedThreadToast({ type: "error", title, description }));

type CommitsState =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | {
      readonly kind: "ready";
      readonly htmlUrl: string;
      readonly commits: ReadonlyArray<ForkUpstreamCommit>;
    };

// Fork-only replacement for the official desktop updater button: reports how
// many upstream commits this build is missing and starts an agent-reviewed update.
export function SidebarForkUpdateButton() {
  const baseSha = import.meta.env.FORK_UPSTREAM_BASE_SHA;
  const repoRoot = import.meta.env.FORK_REPO_ROOT;
  return isElectron && baseSha && repoRoot ? (
    <SidebarForkUpdateControl baseSha={baseSha} repoRoot={repoRoot} />
  ) : null;
}

function SidebarForkUpdateControl({
  baseSha,
  repoRoot,
}: {
  readonly baseSha: string;
  readonly repoRoot: string;
}) {
  const [state, setState] = useState<ForkUpdateCheckState>({ kind: "unknown" });
  const [isStarting, setIsStarting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [commitsState, setCommitsState] = useState<CommitsState>({ kind: "loading" });
  const inFlight = useRef<AbortController | null>(null);
  const projects = useProjects();
  const serverConfigs = useAtomValue(environmentServerConfigsAtom);
  const navigate = useNavigate();
  const createThread = useAtomCommand(threadEnvironment.create, { reportFailure: false });
  const deleteThread = useAtomCommand(threadEnvironment.delete, { reportFailure: false });
  const startThreadTurn = useAtomCommand(threadEnvironment.startTurn, { reportFailure: false });

  const check = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState({ kind: "checking" });
    try {
      const response = await fetch(buildForkCompareUrl(baseSha), {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      });
      const parsed = response.ok ? parseForkCompareResponse(await response.json()) : null;
      if (controller.signal.aborted) return;
      setState(parsed ? { kind: "ready", aheadBy: parsed.aheadBy } : { kind: "error" });
    } catch {
      if (!controller.signal.aborted) setState({ kind: "error" });
    }
  }, [baseSha]);

  useEffect(() => {
    void check();
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      inFlight.current?.abort();
    };
  }, [check]);

  useEffect(() => {
    if (!popoverOpen) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(buildForkCommitsUrl(baseSha), {
          headers: { Accept: "application/vnd.github+json" },
          signal: controller.signal,
        });
        const parsed = response.ok ? parseForkCommitsResponse(await response.json()) : null;
        if (controller.signal.aborted) return;
        setCommitsState(parsed ? { kind: "ready", ...parsed } : { kind: "error" });
      } catch {
        if (!controller.signal.aborted) setCommitsState({ kind: "error" });
      }
    })();
    return () => controller.abort();
  }, [baseSha, popoverOpen]);

  const threadRef = useParams({
    strict: false,
    select: (params) => resolveThreadRouteRef(params),
  });
  const openLink = useOpenLink(threadRef);
  const openUrl = (url: string, event: { metaKey: boolean; ctrlKey: boolean }) => {
    openLink(url, { event }).catch((error: unknown) =>
      reportError(
        "Could not open the link",
        error instanceof Error ? error.message : "An error occurred while opening the link.",
      ),
    );
  };

  const startUpdate = useCallback(async () => {
    const project = findProjectByPath(projects, repoRoot);
    if (!project) {
      reportError(
        "Cannot start the update",
        "Add the t3code repo as a project to update the fork.",
      );
      return;
    }
    const projectSettings = resolveProjectSettings(
      serverConfigs.get(project.environmentId)?.settings ?? DEFAULT_SERVER_SETTINGS,
      project.id,
      project,
    ).settings;
    const composerStore = useComposerDraftStore.getState();
    const stickyProvider = composerStore.stickyActiveProvider;
    const modelSelection = resolveForkUpdateModelSelection({
      projectDefault: projectSettings.defaultModelSelection ?? null,
      sticky: stickyProvider
        ? (composerStore.stickyModelSelectionByProvider[stickyProvider] ?? null)
        : null,
    });
    if (!modelSelection) {
      reportError("Cannot start the update", "Pick a model in a new thread first, then retry.");
      return;
    }

    const { environmentId } = project;
    const threadId = newThreadId();
    const createdAt = new Date().toISOString();
    const runtimeMode = projectSettings.defaultRuntimeMode;

    const createResult = await createThread({
      environmentId,
      input: {
        threadId,
        projectId: project.id,
        title: FORK_UPDATE_THREAD_TITLE,
        modelSelection,
        runtimeMode,
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdAt,
      },
    });
    let failure: AtomCommandResult<unknown, unknown> | null =
      createResult._tag === "Failure" ? createResult : null;

    if (failure === null) {
      const startResult = await startThreadTurn({
        environmentId,
        input: {
          threadId,
          message: {
            messageId: newMessageId(),
            role: "user",
            text: FORK_UPDATE_PROMPT,
            attachments: [],
          },
          modelSelection,
          titleSeed: FORK_UPDATE_THREAD_TITLE,
          runtimeMode,
          interactionMode: "default",
          createdAt,
        },
      });
      failure = startResult._tag === "Failure" ? startResult : null;
    }
    if (failure === null) {
      const startedResult = await settlePromise(() =>
        waitForStartedServerThread(scopeThreadRef(environmentId, threadId)),
      );
      failure = startedResult._tag === "Failure" ? startedResult : null;
    }
    if (failure === null) {
      const navigateResult = await settlePromise(() =>
        navigate({ to: "/$environmentId/$threadId", params: { environmentId, threadId } }),
      );
      failure = navigateResult._tag === "Failure" ? navigateResult : null;
    }
    if (failure === null) return;

    const cleanupResult = await deleteThread({ environmentId, input: { threadId } });
    if (cleanupResult._tag === "Failure" && !isAtomCommandInterrupted(cleanupResult)) {
      console.warn("Failed to clean up update thread after start failure.", cleanupResult);
    }
    if (!isAtomCommandInterrupted(failure)) {
      const error = squashAtomCommandFailure(failure);
      reportError(
        "Could not start the update thread",
        error instanceof Error ? error.message : "An error occurred while creating the thread.",
      );
    }
  }, [createThread, deleteThread, navigate, projects, repoRoot, serverConfigs, startThreadTurn]);

  const { tooltip, count, highlighted, action } = resolveForkUpdatePresentation(state);
  const disabled = action === "none" || isStarting;

  const handleClick = () => {
    if (disabled || action !== "check") return;
    void check();
  };

  const handlePopoverOpenChange = (next: boolean) => {
    if (next) setCommitsState({ kind: "loading" });
    setPopoverOpen(next);
  };

  const handleReview = () => {
    setPopoverOpen(false);
    setIsStarting(true);
    void startUpdate().finally(() => setIsStarting(false));
  };

  const aheadBy = state.kind === "ready" ? state.aheadBy : 0;
  const compareUrl =
    commitsState.kind === "ready"
      ? commitsState.htmlUrl
      : `https://github.com/pingdotgg/t3code/compare/${baseSha}...main`;

  const triggerButton = (
    <button
      type="button"
      aria-label={tooltip}
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1 rounded-full outline-hidden ring-ring transition-colors focus-visible:ring-2",
        count === null ? "size-8" : "px-2",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        highlighted
          ? cn(
              "bg-sidebar-control-surface text-sidebar-foreground",
              !disabled && "hover:bg-sidebar-row-hover",
            )
          : cn(
              "text-(--sidebar-icon-color)",
              !disabled && "hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
            ),
        disabled && !highlighted && "opacity-60",
      )}
      onClick={handleClick}
    >
      <PullRequestGlyph.merged className="size-4" />
      {count !== null ? <span className="text-xs font-semibold tabular-nums">{count}</span> : null}
    </button>
  );

  const tooltipPopup = (
    <TooltipPopup align="center" side="top" variant={highlighted ? "glass" : "default"}>
      {tooltip}
    </TooltipPopup>
  );

  return (
    <SidebarMenuItem className="ml-auto shrink-0">
      {action === "open" ? (
        <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          <Tooltip>
            <TooltipTrigger
              render={<PopoverTrigger render={triggerButton} disabled={isStarting} />}
            />
            {tooltipPopup}
          </Tooltip>
          <PopoverPopup side="top" align="start" padding="compact" width="lg">
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
              Upstream · {aheadBy} new {aheadBy === 1 ? "commit" : "commits"}
            </p>
            {commitsState.kind === "loading" ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Loading commits…</p>
            ) : commitsState.kind === "error" ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Could not load commits.</p>
            ) : (
              <>
                <ul
                  className="flex max-h-[260px] flex-col overflow-y-auto"
                  aria-label="Upstream commits"
                >
                  {commitsState.commits.map((commit) => (
                    <li key={commit.sha}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-baseline gap-2 rounded-sm px-1 py-1 text-left outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(event) => openUrl(commit.htmlUrl, event)}
                      >
                        <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                          {commit.shortSha}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs">{commit.title}</span>
                          <span className="truncate text-2xs text-muted-foreground">
                            {commit.author}
                            {commit.date ? ` · ${formatRelativeTimeLabel(commit.date)}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {aheadBy > commitsState.commits.length ? (
                  <p className="px-1 pt-1 text-2xs text-muted-foreground">
                    +{aheadBy - commitsState.commits.length} more on GitHub
                  </p>
                ) : null}
              </>
            )}
            <p className="px-1 pt-2 text-2xs text-muted-foreground">
              Conflicts with fork commits are checked by the agent.
            </p>
            <div className="flex justify-end gap-2 px-1 pt-2">
              <Button variant="outline" size="xs" onClick={(event) => openUrl(compareUrl, event)}>
                Open on GitHub
              </Button>
              <Button size="xs" onClick={handleReview}>
                Review with agent
              </Button>
            </div>
          </PopoverPopup>
        </Popover>
      ) : (
        <Tooltip>
          <TooltipTrigger render={triggerButton} />
          {tooltipPopup}
        </Tooltip>
      )}
    </SidebarMenuItem>
  );
}
