import { describe, expect, it } from "vite-plus/test";

import { resolveBackgroundBlurPx } from "./backgroundBlur";

describe("resolveBackgroundBlurPx", () => {
  it("maps percent linearly to 24px at 100%", () => {
    expect(resolveBackgroundBlurPx(0)).toBe(0);
    expect(resolveBackgroundBlurPx(50)).toBe(12);
    expect(resolveBackgroundBlurPx(100)).toBe(24);
  });

  it("clamps out-of-range and non-finite values", () => {
    expect(resolveBackgroundBlurPx(-10)).toBe(0);
    expect(resolveBackgroundBlurPx(250)).toBe(24);
    expect(resolveBackgroundBlurPx(Number.NaN)).toBe(0);
  });
});
