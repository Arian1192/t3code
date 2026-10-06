import { describe, expect, it } from "vite-plus/test";

import { resolveComposerBackgroundUrl } from "./composerBackground";

describe("resolveComposerBackgroundUrl", () => {
  it("accepts http and https URLs and trims whitespace", () => {
    expect(resolveComposerBackgroundUrl("  https://example.com/a.gif ")).toBe(
      "https://example.com/a.gif",
    );
    expect(resolveComposerBackgroundUrl("http://example.com/a.png")).toBe(
      "http://example.com/a.png",
    );
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
    expect(resolveComposerBackgroundUrl(value)).toBeNull();
  });

  it("percent-encodes quotes and parentheses so they cannot escape a CSS string", () => {
    const href = resolveComposerBackgroundUrl('https://example.com/a")b.gif');
    expect(href).not.toBeNull();
    expect(href).not.toContain('"');
    expect(href).not.toContain(" ");
  });
});
