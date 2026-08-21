/**
 * Relief: the terrain content of the map.
 *
 * Relief is a content dimension, not a drawing rule, so it lives in the
 * Layers section beside the other content switches. Two switches carry
 * one parameter each:
 *
 * - Contour lines, with an interval (Auto, 10, 20, 50 or 100 m)
 * - Hillshade, with a strength (Soft or Strong)
 *
 * The colors are not part of this type. The style transform derives
 * them from the theme, so relief works with every theme.
 */

export type HillshadeStrength = "soft" | "strong";

export interface Relief {
  contours: boolean;
  /** "auto", or the interval of the minor line in meters as a string. */
  contourInterval: string;
  hillshade: boolean;
  hillshadeStrength: HillshadeStrength;
}

/** Relief is off in the default poster, so the poster of 0.6 stays. */
export const DEFAULT_RELIEF: Relief = {
  contours: false,
  contourInterval: "auto",
  hillshade: false,
  hillshadeStrength: "soft",
};

export const CONTOUR_INTERVAL_AUTO = "auto";

export interface ContourIntervalOption {
  id: string;
  label: string;
}

export const contourIntervalOptions: ContourIntervalOption[] = [
  { id: CONTOUR_INTERVAL_AUTO, label: "Auto" },
  { id: "10", label: "10 m" },
  { id: "20", label: "20 m" },
  { id: "50", label: "50 m" },
  { id: "100", label: "100 m" },
];

export interface HillshadeStrengthOption {
  id: HillshadeStrength;
  label: string;
}

export const hillshadeStrengthOptions: HillshadeStrengthOption[] = [
  { id: "soft", label: "Soft" },
  { id: "strong", label: "Strong" },
];

export function isContourInterval(value: unknown): value is string {
  return contourIntervalOptions.some((option) => option.id === value);
}

export function isHillshadeStrength(value: unknown): value is HillshadeStrength {
  return value === "soft" || value === "strong";
}

/** True when the poster draws terrain of any kind. */
export function hasRelief(relief: Relief): boolean {
  return relief.contours || relief.hillshade;
}

/**
 * The contour intervals per zoom, as `[minor, major]` in meters.
 *
 * The poster map renders over-zoomed: the canvas is 5.5 times wider
 * than the visible frame and is scaled down. The MapLibre zoom of a
 * tile is therefore about 2.5 steps above the zoom that the visitor
 * sees, and these thresholds follow the MapLibre zoom.
 *
 * `maplibre-contour` reads the entry of the next lower zoom when a
 * zoom has no entry of its own, so one entry per step is enough.
 */
const AUTO_CONTOUR_THRESHOLDS: Record<number, [number, number]> = {
  0: [500, 2500],
  12: [200, 1000],
  14: [100, 500],
  16: [50, 250],
  17: [20, 100],
  18: [10, 50],
};

/**
 * Builds the thresholds for one interval choice. A fixed interval uses
 * one entry, so every zoom draws the same lines. The major line sits
 * every fifth minor line.
 */
export function contourThresholds(
  interval: string,
): Record<number, [number, number]> {
  if (interval === CONTOUR_INTERVAL_AUTO) {
    return AUTO_CONTOUR_THRESHOLDS;
  }
  const minor = Number(interval);
  if (!Number.isFinite(minor) || minor <= 0) {
    return AUTO_CONTOUR_THRESHOLDS;
  }
  return { 0: [minor, minor * 5] };
}
