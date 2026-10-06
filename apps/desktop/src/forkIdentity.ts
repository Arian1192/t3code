/**
 * Fork-only identity for packaged desktop builds, so the fork can run next to
 * the official app with no shared state. Kept in one place to ease rebasing.
 * Development builds keep the upstream names.
 */
export const FORK_USER_DATA_DIR_NAME = "t3code-fork";
export const FORK_DEFAULT_HOME_DIR_NAME = ".t3-fork";
