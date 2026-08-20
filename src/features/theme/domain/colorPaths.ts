import type { ResolvedTheme, ThemeColorKey } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getThemeColorByPath(
  theme: unknown,
  keyPath: ThemeColorKey | string,
): string {
  if (!isObject(theme)) return "";

  const segments = String(keyPath)
    .split(".")
    .filter(Boolean);
  let current: unknown = theme;

  for (const segment of segments) {
    if (!isObject(current) || !(segment in current)) return "";
    current = current[segment];
  }

  return typeof current === "string" ? current : "";
}

function setThemeColorByPath(
  theme: Record<string, unknown>,
  keyPath: string,
  value: string,
): void {
  const segments = keyPath.split(".").filter(Boolean);
  if (segments.length === 0) return;

  let current: Record<string, unknown> = theme;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const next = current[segment];
    if (!isObject(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

export function applyThemeColorOverrides(
  baseTheme: ResolvedTheme,
  overrides: Record<string, string>,
): ResolvedTheme {
  const hasOverrides = Object.keys(overrides).length > 0;
  if (!hasOverrides) return baseTheme;

  const nextTheme: ResolvedTheme = {
    ...baseTheme,
    ui: { ...baseTheme.ui },
    map: {
      ...baseTheme.map,
      roads: { ...baseTheme.map.roads },
    },
  };

  for (const [keyPath, color] of Object.entries(overrides)) {
    if (typeof color !== "string" || !color.trim()) continue;
    setThemeColorByPath(nextTheme as unknown as Record<string, unknown>, keyPath, color);
  }

  // A user-picked building color wins over the theme's height triad.
  if (typeof overrides["map.buildings"] === "string") {
    delete nextTheme.map.buildingsTriad;
  }

  return nextTheme;
}
