import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => ({ composer: "", chat: "", dim: 70, blur: 0 }));

vi.mock("~/hooks/useSettings", () => ({
  useClientSettings: (
    selector: (settings: {
      composerBackgroundUrl: string;
      chatBackgroundUrl: string;
      chatBackgroundDim: number;
      chatBackgroundBlur: number;
    }) => unknown,
  ) =>
    selector({
      composerBackgroundUrl: state.composer,
      chatBackgroundUrl: state.chat,
      chatBackgroundDim: state.dim,
      chatBackgroundBlur: state.blur,
    }),
}));

import { ChatBackgroundLayer } from "./ChatBackgroundLayer";
import { ComposerBackgroundLayer } from "./ComposerBackgroundLayer";

beforeEach(() => {
  state.composer = "";
  state.chat = "";
  state.dim = 70;
  state.blur = 0;
});

describe("ComposerBackgroundLayer", () => {
  it("renders nothing when empty or unsafe", () => {
    expect(renderToStaticMarkup(<ComposerBackgroundLayer />)).toBe("");
    state.composer = "javascript:alert(1)";
    expect(renderToStaticMarkup(<ComposerBackgroundLayer />)).toBe("");
  });

  it("renders a quoted, rounded image layer without a dim overlay", () => {
    state.composer = "https://example.com/rain.gif";
    const html = renderToStaticMarkup(<ComposerBackgroundLayer />);
    expect(html).toContain('data-slot="composer-background"');
    expect(html).toContain("rain.gif");
    expect(html).toContain("aria-hidden");
    expect(html).toContain("rounded-3xl");
    expect(html).not.toContain("bg-background");
  });
});

describe("ChatBackgroundLayer", () => {
  it("renders nothing when empty or unsafe", () => {
    expect(renderToStaticMarkup(<ChatBackgroundLayer />)).toBe("");
    state.chat = "data:image/gif;base64,AAAA";
    expect(renderToStaticMarkup(<ChatBackgroundLayer />)).toBe("");
  });

  it("renders the image with a theme-colored dim overlay", () => {
    state.chat = "https://example.com/forest.gif";
    state.dim = 70;
    const html = renderToStaticMarkup(<ChatBackgroundLayer />);
    expect(html).toContain('data-slot="chat-background"');
    expect(html).toContain("forest.gif");
    expect(html).toContain("bg-background");
    expect(html).toContain("opacity:0.7");
    expect(html).toContain("pointer-events-none");
  });

  it("blurs only the image when the blur setting is above zero", () => {
    state.chat = "https://example.com/forest.gif";
    expect(renderToStaticMarkup(<ChatBackgroundLayer />)).not.toContain("filter:blur");
    state.blur = 50;
    const html = renderToStaticMarkup(<ChatBackgroundLayer />);
    expect(html).toContain("filter:blur(12px)");
    expect(html).toContain('data-slot="chat-background"');
  });
});
