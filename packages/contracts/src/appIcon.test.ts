// @effect-diagnostics globalDate:off -- The resolver takes a plain local Date, so the tests construct them directly.

import { describe, expect, it } from "vite-plus/test";

import { resolveCalendarAppIcon } from "./appIcon.ts";

// Local-time constructor: month is 1-based here for readability.
const on = (month: number, day: number) => resolveCalendarAppIcon(new Date(2026, month - 1, day));

describe("resolveCalendarAppIcon", () => {
  it.each([
    [12, 1, "christmas"],
    [12, 31, "christmas"],
    [1, 1, "christmas"],
    [1, 6, "christmas"],
    [1, 7, "winter"],
    [1, 31, "winter"],
    [2, 1, "carnival"],
    [2, 28, "carnival"],
    [3, 1, "winter"],
    [3, 19, "winter"],
    [3, 20, "sakura"],
    [6, 20, "sakura"],
    [6, 21, "tropical-beach"],
    [9, 22, "tropical-beach"],
    [9, 23, "autumn"],
    [10, 14, "autumn"],
    [10, 15, "halloween"],
    [11, 2, "halloween"],
    [11, 3, "autumn"],
    [11, 30, "autumn"],
  ] as const)("maps %i/%i to %s", (month, day, expected) => {
    expect(on(month, day)).toBe(expected);
  });

  it("keeps February 29 in carnival on leap years", () => {
    expect(resolveCalendarAppIcon(new Date(2028, 1, 29))).toBe("carnival");
  });

  it("uses the local date rather than the UTC date", () => {
    // 23:30 local on Oct 14 stays autumn regardless of the UTC offset.
    expect(resolveCalendarAppIcon(new Date(2026, 9, 14, 23, 30))).toBe("autumn");
  });
});
