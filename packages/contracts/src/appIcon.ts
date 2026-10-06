import * as Schema from "effect/Schema";

export const APP_ICON_VARIANTS = [
  "halloween",
  "christmas",
  "pixel-stars",
  "carnival",
  "pixel-night-sky",
  "autumn",
  "sakura",
  "tropical-beach",
  "tropical-flowers",
  "winter",
] as const;
export const AppIconVariant = Schema.Literals(APP_ICON_VARIANTS);
export type AppIconVariant = typeof AppIconVariant.Type;

/** `"calendar"` picks a variant from the local date; anything else pins that variant. */
export const AppIconSetting = Schema.Literals(["calendar", ...APP_ICON_VARIANTS]);
export type AppIconSetting = typeof AppIconSetting.Type;

/**
 * Seasonal and holiday icon for a local date. pixel-stars, pixel-night-sky and
 * tropical-flowers are never chosen here; they are manual-only.
 */
export function resolveCalendarAppIcon(date: Date): AppIconVariant {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 12 || (month === 1 && day <= 6)) return "christmas";
  if (month === 1 || (month === 3 && day <= 19)) return "winter";
  if (month === 2) return "carnival";
  if (month < 6 || (month === 6 && day <= 20) || month === 3) return "sakura";
  if (month < 9 || (month === 9 && day <= 22)) return "tropical-beach";
  if (month === 9 || (month === 10 && day <= 14)) return "autumn";
  if (month === 10 || (month === 11 && day <= 2)) return "halloween";
  return "autumn";
}
