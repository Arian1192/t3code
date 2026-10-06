// @effect-diagnostics globalDate:off -- Calendar dates are built as local Dates to drive the fake clock.

import * as NodePath from "@effect/platform-node/NodePath";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { TestClock } from "effect/testing";

import * as ElectronApp from "../electron/ElectronApp.ts";
import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts";
import * as DesktopAssets from "./DesktopAssets.ts";
import * as DesktopConfig from "./DesktopConfig.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as ForkAppIcon from "./ForkAppIcon.ts";

const localTime = (month: number, day: number, hour = 12) =>
  new Date(2026, month - 1, day, hour).getTime();

const layerEnvironment = (platform: NodeJS.Platform, isPackaged: boolean) =>
  DesktopEnvironment.layer({
    dirname: "/repo/apps/desktop/dist-electron",
    homeDirectory: "/Users/alice",
    platform,
    processArch: "arm64",
    appVersion: "1.2.3",
    appPath: "/Applications/T3 Code.app/Contents/Resources/app.asar",
    isPackaged,
    resourcesPath: "/Applications/T3 Code.app/Contents/Resources",
    runningUnderArm64Translation: false,
  }).pipe(
    Layer.provide(
      Layer.mergeAll(NodeServices.layer, NodePath.layerPosix, DesktopConfig.layerTest({})),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    ForkAppIcon.ForkAppIcon | DesktopEnvironment.DesktopEnvironment | import("effect/Scope").Scope
  >,
  input: {
    readonly platform?: NodeJS.Platform;
    readonly isPackaged?: boolean;
    readonly storedAppIcon?: (typeof DEFAULT_CLIENT_SETTINGS)["appIcon"];
    /** Variants whose files exist; defaults to all. */
    readonly missing?: ReadonlyArray<string>;
    readonly dockIcons: string[];
  },
) =>
  Effect.scoped(effect).pipe(
    Effect.provide(
      ForkAppIcon.layer.pipe(
        Layer.provideMerge(layerEnvironment(input.platform ?? "darwin", input.isPackaged ?? true)),
        Layer.provide(
          Layer.mergeAll(
            FileSystem.layerNoop({
              exists: (path) =>
                Effect.succeed(!(input.missing ?? []).some((name) => path.endsWith(`${name}.png`))),
            }),
            Layer.succeed(DesktopAssets.DesktopAssets, {
              iconPaths: Effect.succeed({
                ico: Option.none(),
                icns: Option.none(),
                png: Option.none(),
              }),
              resolveResourcePath: (fileName) =>
                Effect.succeed(
                  (input.missing ?? []).some((name) => fileName.endsWith(`${name}.png`))
                    ? Option.none()
                    : Option.some(`/res/${fileName}`),
                ),
            }),
            Layer.succeed(ElectronApp.ElectronApp, {
              setDockIcon: (iconPath: string) =>
                Effect.sync(() => {
                  input.dockIcons.push(iconPath);
                }),
            } as unknown as ElectronApp.ElectronApp["Service"]),
            DesktopClientSettings.layerTest(
              input.storedAppIcon === undefined
                ? Option.none()
                : Option.some({ ...DEFAULT_CLIENT_SETTINGS, appIcon: input.storedAppIcon }),
            ),
          ),
        ),
      ),
    ),
  );

describe("ForkAppIcon", () => {
  it.effect("applies the calendar variant once and skips repeats", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        yield* TestClock.setTime(localTime(10, 20));
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.apply("calendar");
        yield* icon.apply("calendar");
        assert.deepEqual(dockIcons, ["/res/app-icons/halloween.png"]);
      }),
      { dockIcons },
    );
  });

  it.effect("applies a pinned variant regardless of the date", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        yield* TestClock.setTime(localTime(10, 20));
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.apply("calendar");
        yield* icon.apply("sakura");
        assert.deepEqual(dockIcons, ["/res/app-icons/halloween.png", "/res/app-icons/sakura.png"]);
      }),
      { dockIcons },
    );
  });

  it.effect("uses the repository assets when unpackaged", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        const environment = yield* DesktopEnvironment.DesktopEnvironment;
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.apply("winter");
        assert.deepEqual(dockIcons, [
          environment.path.join(environment.rootDir, "assets/fork/app-icons/winter.png"),
        ]);
      }),
      { dockIcons, isPackaged: false },
    );
  });

  it.effect("keeps the current icon when the variant file is missing", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.apply("winter");
        assert.deepEqual(dockIcons, []);
      }),
      { dockIcons, missing: ["winter"] },
    );
  });

  it.effect("does nothing off macOS", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.configure;
        yield* icon.apply("winter");
        assert.deepEqual(dockIcons, []);
      }),
      { dockIcons, platform: "linux" },
    );
  });

  it.effect("applies the stored setting at startup", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.configure;
        assert.deepEqual(dockIcons, ["/res/app-icons/tropical-flowers.png"]);
      }),
      { dockIcons, storedAppIcon: "tropical-flowers" },
    );
  });

  it.effect("switches a calendar icon when the date rolls over while running", () => {
    const dockIcons: string[] = [];
    return run(
      Effect.gen(function* () {
        yield* TestClock.setTime(localTime(1, 31));
        const icon = yield* ForkAppIcon.ForkAppIcon;
        yield* icon.configure;
        yield* TestClock.adjust("25 hours");
        assert.deepEqual(dockIcons, ["/res/app-icons/winter.png", "/res/app-icons/carnival.png"]);
      }),
      { dockIcons },
    );
  });
});
