/**
 * Shared poster text layout constants and pure helpers used by both the live
 * preview overlay and the export canvas renderer.
 */
import { parseHex } from "@/shared/utils/color";
export const TEXT_DIMENSION_REFERENCE_PX = 3600;

/**
 * Where each line sits INSIDE the text block of the sheet. The sheet
 * model gives the block its own box, and these four ratios place the
 * lines in it. At the default sheet the block covers the lowest
 * quarter of the poster, and the four ratios then reproduce the
 * positions of release 0.7 exactly: 0.845, 0.875, 0.9 and 0.93 of the
 * poster height.
 */
export const TEXT_BLOCK_CITY_RATIO = 0.38;
export const TEXT_BLOCK_DIVIDER_RATIO = 0.5;
export const TEXT_BLOCK_COUNTRY_RATIO = 0.6;
export const TEXT_BLOCK_COORDS_RATIO = 0.72;

/** Margin from the edges for attribution/credits. */
export const TEXT_EDGE_MARGIN_RATIO = 0.02;

/** City text scales down when labels get long. */
export const CITY_TEXT_SHRINK_THRESHOLD = 10;

export const CITY_FONT_BASE_PX = 250;
export const CITY_FONT_MIN_PX = 110;
export const COUNTRY_FONT_BASE_PX = 92;
export const COORDS_FONT_BASE_PX = 58;
export const ATTRIBUTION_FONT_BASE_PX = 50;

/**
 * The credit for the terrain data. The poster carries it only while
 * relief is on and the credits are on. The full attribution of the
 * twelve sources lives on the site, in the map attribution dialog.
 */
export const TERRAIN_CREDIT_TEXT =
  "Terrain: Tilezen terrain tiles (Copernicus EU-DEM, USGS SRTM and others)";

/** How far the terrain line sits above the OpenStreetMap line. */
export const TERRAIN_CREDIT_LINE_STEP = 1.45;

export function isLatinScript(text: string | undefined | null): boolean {
  if (!text) {
    return true;
  }

  let latinCount = 0;
  let alphaCount = 0;

  for (const char of text) {
    if (/[A-Za-z\u00C0-\u024F]/.test(char)) {
      latinCount += 1;
      alphaCount += 1;
    } else if (/\p{L}/u.test(char)) {
      alphaCount += 1;
    }
  }

  if (alphaCount === 0) {
    return true;
  }

  return latinCount / alphaCount > 0.8;
}

export function formatCityLabel(city: string): string {
  return isLatinScript(city) ? city.toUpperCase().split("").join("  ") : city;
}

/**
 * Returns a multiplier (≤1) to shrink the city font for long names.
 * Callers apply it to their own base font size.
 */
export function computeCityFontScale(city: string): number {
  const len = Math.max(city.length, 1);
  if (len <= CITY_TEXT_SHRINK_THRESHOLD) {
    return 1;
  }
  return Math.max(
    CITY_FONT_MIN_PX / CITY_FONT_BASE_PX,
    CITY_TEXT_SHRINK_THRESHOLD / len,
  );
}

/**
 * Determines the correct attribution text colour.
 * When markers are shown the text colour is used directly;
 * otherwise a light/dark safe colour is derived from the land luminance.
 */
export function computeAttributionColor(
  textColor: string,
  landHex: string,
  showOverlay: boolean,
): string {
  if (showOverlay) {
    return textColor;
  }
  const landRgb = parseHex(landHex);
  const luma = landRgb
    ? (0.2126 * landRgb.r + 0.7152 * landRgb.g + 0.0722 * landRgb.b) / 255
    : 0.5;
  return luma < 0.52 ? "#f5faff" : "#0e1822";
}
