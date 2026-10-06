import { describe, expect, it } from "vite-plus/test";

import { resolveBackgroundImageUrl } from "./backgroundImageUrl";

describe("resolveBackgroundImageUrl", () => {
  it("accepts http and https URLs and trims whitespace", () => {
    expect(resolveBackgroundImageUrl("  https://example.com/a.gif ")).toBe(
      "https://example.com/a.gif",
    );
    expect(resolveBackgroundImageUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });

  it.each([
    "",
    "   ",
    "not a url",
    "javascript:alert(1)",
    "data:image/gif;base64,R0lGOD",
    "file:///etc/passwd",
    "blob:https://example.com/x",
    "ftp://example.com/a.gif",
  ])("rejects %j", (value) => {
    expect(resolveBackgroundImageUrl(value)).toBeNull();
  });

  it("percent-encodes quotes and parentheses so they cannot escape a CSS string", () => {
    const href = resolveBackgroundImageUrl('https://example.com/a")b.gif');
    expect(href).not.toBeNull();
    expect(href).not.toContain('"');
    expect(href).not.toContain(" ");
  });
});
