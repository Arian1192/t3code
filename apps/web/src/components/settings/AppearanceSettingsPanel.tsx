import type { CSSProperties } from "react";
import { useState } from "react";
import { APP_ICON_VARIANTS, type AppIconSetting } from "@t3tools/contracts";
import {
  DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE,
  DEFAULT_UNIFIED_SETTINGS,
  type ChatWidth,
  type EnvironmentIdentificationMode,
  MAX_APPEARANCE_CONTRAST,
  MAX_CHAT_BACKGROUND_BLUR,
  MAX_CHAT_BACKGROUND_DIM,
  MAX_GLASS_OPACITY,
  MAX_PANEL_ANIMATION_DURATION_MS,
  MIN_APPEARANCE_CONTRAST,
  MIN_CHAT_BACKGROUND_BLUR,
  MIN_CHAT_BACKGROUND_DIM,
  MIN_GLASS_OPACITY,
  MIN_PANEL_ANIMATION_DURATION_MS,
} from "@t3tools/contracts/settings";
import {
  resolveEnvironmentIdentificationPillLabel,
  useEnvironmentStageLabel,
} from "../SidebarStageBackdrop";
import { isElectron } from "../../env";
import { isMacPlatform } from "../../lib/utils";
import { useCustomThemes } from "../../hooks/useCustomThemes";
import { useTheme } from "../../hooks/useTheme";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { DraftInput } from "../ui/draft-input";
import { Switch } from "../ui/switch";
import { ProviderAccentColorPicker } from "./ProviderAccentColorPicker";
import { ThemeLibrary } from "./ThemeSettings";
import {
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { PanelAnimationsPreview } from "./PanelAnimationsPreview";
import { TypographySection } from "./TypographySettings";

const ENVIRONMENT_IDENTIFICATION_LABELS: Record<EnvironmentIdentificationMode, string> = {
  artwork: "Artwork",
  pill: "Version pill",
  none: "None",
};

const APP_ICON_LABELS: Record<AppIconSetting, string> = {
  calendar: "Follow calendar",
  halloween: "Halloween",
  christmas: "Christmas",
  "pixel-stars": "Pixel stars",
  carnival: "Carnival",
  "pixel-night-sky": "Pixel night sky",
  autumn: "Autumn",
  sakura: "Sakura",
  "tropical-beach": "Tropical beach",
  "tropical-flowers": "Tropical flowers",
  winter: "Winter",
};

const CHAT_WIDTH_LABELS: Record<ChatWidth, string> = {
  comfortable: "Comfortable",
  wide: "Wide",
  full: "Full",
};

export function AppearanceSettingsPanel() {
  const {
    appearanceMode,
    refreshTheme,
    resolvedTheme,
    setAppearanceMode,
    setTheme,
    setThemeHalf,
    theme,
    themeHalves,
  } = useTheme();
  const customThemes = useCustomThemes();
  const [isImportThemeOpen, setIsImportThemeOpen] = useState(false);
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const environmentStageLabel = useEnvironmentStageLabel();
  const showEnvironmentIdentification =
    resolveEnvironmentIdentificationPillLabel(environmentStageLabel) !== null;
  const glassOpacityRatio =
    (settings.glassOpacity - MIN_GLASS_OPACITY) / (MAX_GLASS_OPACITY - MIN_GLASS_OPACITY);
  const chatBackgroundDimRatio =
    (settings.chatBackgroundDim - MIN_CHAT_BACKGROUND_DIM) /
    (MAX_CHAT_BACKGROUND_DIM - MIN_CHAT_BACKGROUND_DIM);
  const chatBackgroundDimSliderStyle = {
    "--settings-slider-progress": `${chatBackgroundDimRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - chatBackgroundDimRatio}rem`,
  } as CSSProperties;
  const chatBackgroundBlurRatio =
    (settings.chatBackgroundBlur - MIN_CHAT_BACKGROUND_BLUR) /
    (MAX_CHAT_BACKGROUND_BLUR - MIN_CHAT_BACKGROUND_BLUR);
  const chatBackgroundBlurSliderStyle = {
    "--settings-slider-progress": `${chatBackgroundBlurRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - chatBackgroundBlurRatio}rem`,
  } as CSSProperties;
  const glassOpacitySliderStyle = {
    "--settings-slider-progress": `${glassOpacityRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - glassOpacityRatio}rem`,
  } as CSSProperties;
  const appearanceContrastRatio =
    (settings.appearanceContrast - MIN_APPEARANCE_CONTRAST) /
    (MAX_APPEARANCE_CONTRAST - MIN_APPEARANCE_CONTRAST);
  const appearanceContrastSliderStyle = {
    "--settings-slider-progress": `${appearanceContrastRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - appearanceContrastRatio}rem`,
  } as CSSProperties;
  const panelAnimationDurationRatio =
    (settings.panelAnimationDurationMs - MIN_PANEL_ANIMATION_DURATION_MS) /
    (MAX_PANEL_ANIMATION_DURATION_MS - MIN_PANEL_ANIMATION_DURATION_MS);
  const panelAnimationDurationSliderStyle = {
    "--settings-slider-progress": `${panelAnimationDurationRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - panelAnimationDurationRatio}rem`,
  } as CSSProperties;

  return (
    <SettingsPageContainer>
      <SettingsSection id="appearance" title="Colors & themes" variant="plain" hideTitle>
        <div id={searchableSetting("theme").id}>
          <ThemeLibrary
            appearanceMode={appearanceMode}
            customThemes={customThemes}
            initialAppearance={resolvedTheme}
            refreshTheme={refreshTheme}
            isImportOpen={isImportThemeOpen}
            setAppearanceMode={setAppearanceMode}
            setTheme={setTheme}
            setThemeHalf={setThemeHalf}
            theme={theme}
            themeHalves={themeHalves}
            onImportOpenChange={setIsImportThemeOpen}
          />
        </div>
      </SettingsSection>

      <SettingsSection id="appearance-interface" title="Interface">
        <SettingsRow
          {...searchableSetting("setting-appearance-contrast")}
          description="Adjust the contrast of colors and borders across the interface."
          resetAction={
            settings.appearanceContrast !== DEFAULT_UNIFIED_SETTINGS.appearanceContrast ? (
              <SettingResetButton
                label="contrast"
                onClick={() =>
                  updateSettings({
                    appearanceContrast: DEFAULT_UNIFIED_SETTINGS.appearanceContrast,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="appearance-contrast"
              >
                {settings.appearanceContrast}%
              </output>
              <input
                aria-label="Contrast"
                className="settings-slider min-w-0 flex-1"
                id="appearance-contrast"
                max={MAX_APPEARANCE_CONTRAST}
                min={MIN_APPEARANCE_CONTRAST}
                onChange={(event) => {
                  const appearanceContrast = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(appearanceContrast) &&
                    appearanceContrast >= MIN_APPEARANCE_CONTRAST &&
                    appearanceContrast <= MAX_APPEARANCE_CONTRAST
                  ) {
                    updateSettings({ appearanceContrast });
                  }
                }}
                step={5}
                style={appearanceContrastSliderStyle}
                type="range"
                value={settings.appearanceContrast}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-glass-opacity")}
          description="Higher values make menus, dialogs, and the composer more solid."
          resetAction={
            settings.glassOpacity !== DEFAULT_UNIFIED_SETTINGS.glassOpacity ? (
              <SettingResetButton
                label="glass opacity"
                onClick={() =>
                  updateSettings({ glassOpacity: DEFAULT_UNIFIED_SETTINGS.glassOpacity })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="glass-opacity"
              >
                {settings.glassOpacity}%
              </output>
              <input
                aria-label="Glass opacity"
                className="settings-slider min-w-0 flex-1"
                id="glass-opacity"
                max={MAX_GLASS_OPACITY}
                min={MIN_GLASS_OPACITY}
                onChange={(event) => {
                  const glassOpacity = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(glassOpacity) &&
                    glassOpacity >= MIN_GLASS_OPACITY &&
                    glassOpacity <= MAX_GLASS_OPACITY
                  ) {
                    updateSettings({ glassOpacity });
                  }
                }}
                step={5}
                style={glassOpacitySliderStyle}
                type="range"
                value={settings.glassOpacity}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-composer-background")}
          description="Show an image or GIF behind the composer. Enter an http or https URL; leave empty to turn off. Hidden while reduced motion is on or the window is in the background."
          resetAction={
            settings.composerBackgroundUrl !== DEFAULT_UNIFIED_SETTINGS.composerBackgroundUrl ? (
              <SettingResetButton
                label="composer background"
                onClick={() =>
                  updateSettings({
                    composerBackgroundUrl: DEFAULT_UNIFIED_SETTINGS.composerBackgroundUrl,
                  })
                }
              />
            ) : null
          }
          control={
            <DraftInput
              size="sm"
              className="w-full sm:w-72"
              value={settings.composerBackgroundUrl}
              onCommit={(next) => updateSettings({ composerBackgroundUrl: next.trim() })}
              placeholder="https://example.com/background.gif"
              spellCheck={false}
              aria-label="Composer background URL"
            />
          }
        />

        <SettingsRow
          {...searchableSetting("setting-chat-background")}
          description="Show an image or GIF behind the chat. Enter an http or https URL; leave empty to turn off. Hidden while reduced motion is on or the window is in the background."
          resetAction={
            settings.chatBackgroundUrl !== DEFAULT_UNIFIED_SETTINGS.chatBackgroundUrl ? (
              <SettingResetButton
                label="chat background"
                onClick={() =>
                  updateSettings({ chatBackgroundUrl: DEFAULT_UNIFIED_SETTINGS.chatBackgroundUrl })
                }
              />
            ) : null
          }
          control={
            <DraftInput
              size="sm"
              className="w-full sm:w-72"
              value={settings.chatBackgroundUrl}
              onCommit={(next) => updateSettings({ chatBackgroundUrl: next.trim() })}
              placeholder="https://example.com/background.gif"
              spellCheck={false}
              aria-label="Chat background URL"
            />
          }
        />

        <SettingsRow
          {...searchableSetting("setting-chat-background-dim")}
          description="Higher values fade the chat background more so messages stay readable."
          resetAction={
            settings.chatBackgroundDim !== DEFAULT_UNIFIED_SETTINGS.chatBackgroundDim ? (
              <SettingResetButton
                label="chat background dim"
                onClick={() =>
                  updateSettings({ chatBackgroundDim: DEFAULT_UNIFIED_SETTINGS.chatBackgroundDim })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="chat-background-dim"
              >
                {settings.chatBackgroundDim}%
              </output>
              <input
                aria-label="Chat background dim"
                className="settings-slider min-w-0 flex-1"
                id="chat-background-dim"
                max={MAX_CHAT_BACKGROUND_DIM}
                min={MIN_CHAT_BACKGROUND_DIM}
                onChange={(event) => {
                  const chatBackgroundDim = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(chatBackgroundDim) &&
                    chatBackgroundDim >= MIN_CHAT_BACKGROUND_DIM &&
                    chatBackgroundDim <= MAX_CHAT_BACKGROUND_DIM
                  ) {
                    updateSettings({ chatBackgroundDim });
                  }
                }}
                step={5}
                style={chatBackgroundDimSliderStyle}
                type="range"
                value={settings.chatBackgroundDim}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-chat-background-blur")}
          description="Blur the chat background image. Blurring an animated GIF uses more GPU."
          resetAction={
            settings.chatBackgroundBlur !== DEFAULT_UNIFIED_SETTINGS.chatBackgroundBlur ? (
              <SettingResetButton
                label="chat background blur"
                onClick={() =>
                  updateSettings({
                    chatBackgroundBlur: DEFAULT_UNIFIED_SETTINGS.chatBackgroundBlur,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="chat-background-blur"
              >
                {settings.chatBackgroundBlur}%
              </output>
              <input
                aria-label="Chat background blur"
                className="settings-slider min-w-0 flex-1"
                id="chat-background-blur"
                max={MAX_CHAT_BACKGROUND_BLUR}
                min={MIN_CHAT_BACKGROUND_BLUR}
                onChange={(event) => {
                  const chatBackgroundBlur = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(chatBackgroundBlur) &&
                    chatBackgroundBlur >= MIN_CHAT_BACKGROUND_BLUR &&
                    chatBackgroundBlur <= MAX_CHAT_BACKGROUND_BLUR
                  ) {
                    updateSettings({ chatBackgroundBlur });
                  }
                }}
                step={5}
                style={chatBackgroundBlurSliderStyle}
                type="range"
                value={settings.chatBackgroundBlur}
              />
            </div>
          }
        />

        {isElectron && isMacPlatform(navigator.platform) ? (
          <SettingsRow
            {...searchableSetting("setting-app-icon")}
            description="Dock icon while T3 Code is running. Follow calendar switches it by season and holidays."
            resetAction={
              settings.appIcon !== DEFAULT_UNIFIED_SETTINGS.appIcon ? (
                <SettingResetButton
                  label="app icon"
                  onClick={() => updateSettings({ appIcon: DEFAULT_UNIFIED_SETTINGS.appIcon })}
                />
              ) : null
            }
            control={
              <Select
                value={settings.appIcon}
                onValueChange={(value) => {
                  if (value !== null) updateSettings({ appIcon: value as AppIconSetting });
                }}
              >
                <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="App icon">
                  <SelectValue>{APP_ICON_LABELS[settings.appIcon]}</SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {(["calendar", ...APP_ICON_VARIANTS] as const).map((id) => (
                    <SelectItem hideIndicator key={id} value={id}>
                      {APP_ICON_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            }
          />
        ) : null}

        <SettingsRow
          {...searchableSetting("setting-message-anchor-color")}
          description="Colour of anchored messages in the timeline, the header list, and the minimap."
          resetAction={
            settings.messageAnchorColor !== DEFAULT_UNIFIED_SETTINGS.messageAnchorColor ? (
              <SettingResetButton
                label="anchor colour"
                onClick={() =>
                  updateSettings({
                    messageAnchorColor: DEFAULT_UNIFIED_SETTINGS.messageAnchorColor,
                  })
                }
              />
            ) : null
          }
          control={
            <ProviderAccentColorPicker
              displayName="anchors"
              layout="inline"
              value={settings.messageAnchorColor}
              commitDelayMs={120}
              onCommit={(value) => updateSettings({ messageAnchorColor: value })}
            />
          }
        />

        {showEnvironmentIdentification ? (
          <SettingsRow
            {...searchableSetting("environment-identification")}
            description="Choose how Dev and Nightly environments are identified."
            resetAction={
              settings.environmentIdentificationMode !== DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE ? (
                <SettingResetButton
                  label="environment identification"
                  onClick={() =>
                    updateSettings({
                      environmentIdentificationMode: DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE,
                    })
                  }
                />
              ) : null
            }
            control={
              <Select
                value={settings.environmentIdentificationMode}
                onValueChange={(value) => {
                  if (value === "artwork" || value === "pill" || value === "none") {
                    updateSettings({ environmentIdentificationMode: value });
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-40"
                  aria-label="Environment identification"
                >
                  <SelectValue>
                    {ENVIRONMENT_IDENTIFICATION_LABELS[settings.environmentIdentificationMode]}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {Object.entries(ENVIRONMENT_IDENTIFICATION_LABELS).map(([value, label]) => (
                    <SelectItem hideIndicator key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            }
          />
        ) : null}

        <SettingsRow
          {...searchableSetting("diff-color-scheme")}
          description="Choose colors for additions and deletions, including change counts."
          resetAction={
            settings.diffColorScheme !== DEFAULT_UNIFIED_SETTINGS.diffColorScheme ? (
              <SettingResetButton
                label="diff colors"
                onClick={() =>
                  updateSettings({ diffColorScheme: DEFAULT_UNIFIED_SETTINGS.diffColorScheme })
                }
              />
            ) : null
          }
          control={
            <div className="w-full sm:w-40">
              <Select
                value={settings.diffColorScheme}
                onValueChange={(value) => {
                  if (value === "red-green" || value === "blue-orange")
                    updateSettings({ diffColorScheme: value });
                }}
              >
                <SelectTrigger size="sm" className="w-full min-w-0" aria-label="Diff colors">
                  <span
                    aria-hidden="true"
                    className={
                      settings.diffColorScheme === "blue-orange"
                        ? "flex shrink-0 flex-row-reverse gap-1"
                        : "flex shrink-0 gap-1"
                    }
                  >
                    <span className="size-2 rounded-full bg-diff-deletion" />
                    <span className="size-2 rounded-full bg-diff-addition" />
                  </span>
                  <SelectValue>
                    {settings.diffColorScheme === "blue-orange" ? "Blue & orange" : "Red & green"}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem value="red-green">Red & green (default)</SelectItem>
                  <SelectItem value="blue-orange">Blue & orange</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("composer-context")}
          description="Keep branch and worktree controls below the composer after a thread starts."
          resetAction={
            settings.persistComposerContextStrip !==
            DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip ? (
              <SettingResetButton
                label="composer context"
                onClick={() =>
                  updateSettings({
                    persistComposerContextStrip:
                      DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.persistComposerContextStrip}
              onCheckedChange={(checked) =>
                updateSettings({ persistComposerContextStrip: Boolean(checked) })
              }
              aria-label="Keep composer context visible in active threads"
            />
          }
        />

        <SettingsRow
          {...searchableSetting("chat-width")}
          description="Set how wide messages and the composer can grow on large screens."
          resetAction={
            settings.chatWidth !== DEFAULT_UNIFIED_SETTINGS.chatWidth ? (
              <SettingResetButton
                label="chat width"
                onClick={() => updateSettings({ chatWidth: DEFAULT_UNIFIED_SETTINGS.chatWidth })}
              />
            ) : null
          }
          control={
            <div className="w-full sm:w-40">
              <Select
                value={settings.chatWidth}
                onValueChange={(value) => {
                  if (value === "comfortable" || value === "wide" || value === "full")
                    updateSettings({ chatWidth: value });
                }}
              >
                <SelectTrigger size="sm" className="w-full min-w-0" aria-label="Chat width">
                  <SelectValue>{CHAT_WIDTH_LABELS[settings.chatWidth]}</SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem value="comfortable">Comfortable (default)</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          }
        />
        <SettingsRow
          {...searchableSetting("math-rendering")}
          description="Typeset LaTeX math, such as $x^2$ or \[x^2\], in messages and Markdown previews. The composer keeps TeX source editable."
          resetAction={
            settings.mathRenderingEnabled !== DEFAULT_UNIFIED_SETTINGS.mathRenderingEnabled ? (
              <SettingResetButton
                label="math rendering"
                onClick={() =>
                  updateSettings({
                    mathRenderingEnabled: DEFAULT_UNIFIED_SETTINGS.mathRenderingEnabled,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.mathRenderingEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ mathRenderingEnabled: Boolean(checked) })
              }
              aria-label="Render math"
            />
          }
        />
      </SettingsSection>

      <SettingsSection id="motion" title="Motion">
        <SettingsRow
          {...searchableSetting("panel-animations")}
          description="Set how fast panels open and close."
          control={
            <div className="grid w-full grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 sm:w-auto sm:grid-cols-[7rem_13rem] sm:gap-4">
              <PanelAnimationsPreview durationMs={settings.panelAnimationDurationMs} />
              <div className="flex w-full items-center gap-3">
                <output
                  className="min-w-16 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                  htmlFor="panel-animation-duration"
                >
                  {settings.panelAnimationDurationMs} ms
                </output>
                <input
                  aria-label="Panel animation duration"
                  className="settings-slider min-w-0 flex-1"
                  id="panel-animation-duration"
                  max={MAX_PANEL_ANIMATION_DURATION_MS}
                  min={MIN_PANEL_ANIMATION_DURATION_MS}
                  onChange={(event) => {
                    const panelAnimationDurationMs = Number(event.currentTarget.value);
                    if (
                      Number.isInteger(panelAnimationDurationMs) &&
                      panelAnimationDurationMs >= MIN_PANEL_ANIMATION_DURATION_MS &&
                      panelAnimationDurationMs <= MAX_PANEL_ANIMATION_DURATION_MS
                    ) {
                      updateSettings({ panelAnimationDurationMs });
                    }
                  }}
                  step={25}
                  style={panelAnimationDurationSliderStyle}
                  type="range"
                  value={settings.panelAnimationDurationMs}
                />
              </div>
            </div>
          }
          resetAction={
            settings.panelAnimationDurationMs !==
            DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs ? (
              <SettingResetButton
                label="panel animations"
                onClick={() =>
                  updateSettings({
                    panelAnimationDurationMs: DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs,
                  })
                }
              />
            ) : null
          }
        />
      </SettingsSection>

      <TypographySection />
    </SettingsPageContainer>
  );
}
