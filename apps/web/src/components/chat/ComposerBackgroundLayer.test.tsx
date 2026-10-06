import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => ({ url: "" }));

vi.mock("~/hooks/useSettings", () => ({
  useClientSettings: (selector: (settings: { composerBackgroundUrl: string }) => unknown) =>
    selector({ composerBackgroundUrl: state.url }),
}));

import { ComposerBackgroundLayer } from "./ComposerBackgroundLayer";

beforeEach(() => {
  state.url = "";
});

describe("ComposerBackgroundLayer", () => {
  it("renders nothing when the setting is empty", () => {
    expect(renderToStaticMarkup(<ComposerBackgroundLayer />)).toBe("");
  });

  it("renders nothing for an unsafe URL", () => {
    state.url = "javascript:alert(1)";
    expect(renderToStaticMarkup(<ComposerBackgroundLayer />)).toBe("");
  });

  it("renders a quoted background image for a valid URL", () => {
    state.url = "https://example.com/rain.gif";
    const html = renderToStaticMarkup(<ComposerBackgroundLayer />);
    expect(html).toContain('data-slot="composer-background"');
    expect(html).toContain("rain.gif");
    expect(html).toContain("aria-hidden");
  });
});
