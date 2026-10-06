import {
  resolveCalendarAppIcon,
  type AppIconSetting,
  type AppIconVariant,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import type * as Scope from "effect/Scope";

import * as ElectronApp from "../electron/ElectronApp.ts";
import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";
import * as DesktopAssets from "./DesktopAssets.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";

// While following the calendar, the variant is re-resolved this often. The
// Dock icon is only touched when the resolved variant actually changes.
const CALENDAR_REFRESH_INTERVAL = Duration.hours(1);

/**
 * Fork-only: owns the macOS Dock icon variant chosen by the `appIcon` client
 * setting. Runs after `DesktopAppIdentity.configure`, so it replaces the dev
 * blueprint icon that configure installs for unpackaged runs.
 */
export class ForkAppIcon extends Context.Service<
  ForkAppIcon,
  {
    /** Applies the stored setting, then keeps a calendar-driven icon current. */
    readonly configure: Effect.Effect<void, never, Scope.Scope>;
    /** Applies a newly saved setting. */
    readonly apply: (setting: AppIconSetting) => Effect.Effect<void>;
  }
>()("@t3tools/desktop/app/ForkAppIcon") {}

export const make = Effect.gen(function* () {
  const assets = yield* DesktopAssets.DesktopAssets;
  const electronApp = yield* ElectronApp.ElectronApp;
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
  const fileSystem = yield* FileSystem.FileSystem;
  const settingRef = yield* Ref.make<AppIconSetting>("calendar");
  const appliedRef = yield* Ref.make<Option.Option<AppIconVariant>>(Option.none());

  const resolveVariantPath = Effect.fn("desktop.forkAppIcon.resolveVariantPath")(function* (
    variant: AppIconVariant,
  ) {
    if (!environment.isPackaged) {
      const sourcePath = environment.path.join(
        environment.rootDir,
        "assets",
        "fork",
        "app-icons",
        `${variant}.png`,
      );
      if (yield* fileSystem.exists(sourcePath)) return Option.some(sourcePath);
    }
    return yield* assets.resolveResourcePath(`app-icons/${variant}.png`);
  });

  const refresh = Effect.gen(function* () {
    if (environment.platform !== "darwin") return;
    const setting = yield* Ref.get(settingRef);
    const variant =
      setting === "calendar" ? resolveCalendarAppIcon(yield* DateTime.nowAsDate) : setting;
    if (Option.contains(yield* Ref.get(appliedRef), variant)) return;

    const iconPath = yield* resolveVariantPath(variant);
    if (Option.isNone(iconPath)) {
      return yield* Effect.logWarning("Fork app icon file not found; keeping the current icon.", {
        variant,
      });
    }
    yield* electronApp.setDockIcon(iconPath.value);
    yield* Ref.set(appliedRef, Option.some(variant));
  }).pipe(
    Effect.catchCause((cause) => Effect.logWarning("Could not apply the fork app icon.", cause)),
    Effect.withSpan("desktop.forkAppIcon.refresh"),
  );

  return ForkAppIcon.of({
    configure: Effect.gen(function* () {
      if (environment.platform !== "darwin") return;
      const stored = yield* clientSettings.get.pipe(Effect.orElseSucceed(() => Option.none()));
      yield* Ref.set(
        settingRef,
        Option.match(stored, { onNone: () => "calendar" as const, onSome: (s) => s.appIcon }),
      );
      yield* refresh;
      yield* Effect.sleep(CALENDAR_REFRESH_INTERVAL).pipe(
        Effect.andThen(refresh),
        Effect.forever,
        Effect.forkScoped,
      );
    }),
    apply: (setting) => Ref.set(settingRef, setting).pipe(Effect.andThen(refresh)),
  });
});

export const layer = Layer.effect(ForkAppIcon, make);
