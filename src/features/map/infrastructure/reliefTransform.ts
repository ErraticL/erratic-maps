import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";
import { hasRelief, type Relief } from "@/features/map/domain/relief";
import {
  buildReliefSources,
  CONTOUR_LEVEL_KEY,
  CONTOUR_VECTOR_LAYER,
  RELIEF_CONTOUR_LAYER_ID,
  RELIEF_CONTOUR_MAJOR_LAYER_ID,
  RELIEF_CONTOUR_SOURCE_ID,
  RELIEF_DEM_SOURCE_ID,
  RELIEF_HILLSHADE_LAYER_ID,
  TERRAIN_MAX_ZOOM,
} from "@/features/map/infrastructure/reliefSource";
import { blendHex, parseHex } from "@/shared/utils/color";

/**
 * Adds the relief layers to a generated map style.
 *
 * The transform runs after `generateMapStyle` and before `applyPlate`.
 * The plate then scales the contour line widths with the weight
 * control, exactly as it scales every other line of the map.
 *
 * The relief layers exist only while relief is on. A style without
 * them holds no terrain source either, so the map requests no terrain
 * tile and Amazon receives nothing.
 */

/**
 * The layer that the relief sits under. Terrain belongs under the
 * built world, so the roads, the rail and the buildings stay readable.
 * The layer always exists in a generated style; only its visibility
 * follows the "Show buildings" switch.
 */
const RELIEF_ANCHOR_LAYER_ID = "building";

/** The same width boost the other line layers take for the over-zoom. */
const OVERZOOM_LINE_WIDTH_SCALE = Math.pow(MAP_OVERZOOM_SCALE, 0.8);

const CONTOUR_MINOR_WIDTH_STOPS: [number, number][] = [
  [10, 0.22],
  [14, 0.32],
  [18, 0.5],
];

const CONTOUR_MAJOR_WIDTH_STOPS: [number, number][] = [
  [10, 0.4],
  [14, 0.6],
  [18, 0.95],
];

const CONTOUR_MINOR_OPACITY = 0.3;
const CONTOUR_MAJOR_OPACITY = 0.5;

/** How far a hillshade tone moves from the land color. */
const HILLSHADE_SHADOW_MIX = 0.55;
const HILLSHADE_HIGHLIGHT_MIX = 0.45;
const HILLSHADE_ACCENT_MIX = 0.25;

const HILLSHADE_EXAGGERATION: Record<string, number> = {
  soft: 0.3,
  strong: 0.55,
};

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) {
    return 0.5;
  }
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function widthExpr(stops: [number, number][]): unknown {
  const flat = stops.flatMap(([zoom, width]) => [
    zoom,
    Math.round(width * OVERZOOM_LINE_WIDTH_SCALE * 1000) / 1000,
  ]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

/**
 * Derives the hillshade tones from the theme.
 *
 * A shadow must be darker than the land and a highlight lighter, on a
 * light theme and on a dark theme alike. The text color gives the
 * theme its own tint whenever it sits on the correct side of the land
 * color; black or white takes over when it does not.
 */
export function hillshadeTones(theme: ResolvedTheme): {
  shadow: string;
  highlight: string;
  accent: string;
} {
  const land = theme.map.land || "#ffffff";
  const text = theme.ui.text || "#111111";
  const landLuma = relativeLuminance(land);
  const textLuma = relativeLuminance(text);

  const darkTone = textLuma < landLuma ? text : "#000000";
  const lightTone = textLuma > landLuma ? text : "#ffffff";

  return {
    shadow: blendHex(land, darkTone, HILLSHADE_SHADOW_MIX),
    highlight: blendHex(land, lightTone, HILLSHADE_HIGHLIGHT_MIX),
    accent: blendHex(land, darkTone, HILLSHADE_ACCENT_MIX),
  };
}

function buildHillshadeLayer(
  theme: ResolvedTheme,
  relief: Relief,
): LayerSpecification {
  const tones = hillshadeTones(theme);
  const exaggeration =
    HILLSHADE_EXAGGERATION[relief.hillshadeStrength] ??
    HILLSHADE_EXAGGERATION.soft;

  return {
    id: RELIEF_HILLSHADE_LAYER_ID,
    type: "hillshade",
    source: RELIEF_DEM_SOURCE_ID,
    maxzoom: TERRAIN_MAX_ZOOM + 6,
    paint: {
      "hillshade-exaggeration": exaggeration,
      "hillshade-shadow-color": tones.shadow,
      "hillshade-highlight-color": tones.highlight,
      "hillshade-accent-color": tones.accent,
    },
  } as LayerSpecification;
}

function buildContourLayer(
  id: string,
  theme: ResolvedTheme,
  major: boolean,
): LayerSpecification {
  return {
    id,
    type: "line",
    source: RELIEF_CONTOUR_SOURCE_ID,
    "source-layer": CONTOUR_VECTOR_LAYER,
    filter: major
      ? [">", ["get", CONTOUR_LEVEL_KEY], 0]
      : ["==", ["get", CONTOUR_LEVEL_KEY], 0],
    paint: {
      "line-color": theme.ui.text || "#111111",
      "line-opacity": major ? CONTOUR_MAJOR_OPACITY : CONTOUR_MINOR_OPACITY,
      "line-width": widthExpr(
        major ? CONTOUR_MAJOR_WIDTH_STOPS : CONTOUR_MINOR_WIDTH_STOPS,
      ),
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  } as LayerSpecification;
}

export function applyRelief(
  style: StyleSpecification,
  theme: ResolvedTheme,
  relief: Relief,
): StyleSpecification {
  if (!hasRelief(relief)) {
    return style;
  }

  const reliefLayers: LayerSpecification[] = [];
  if (relief.hillshade) {
    reliefLayers.push(buildHillshadeLayer(theme, relief));
  }
  if (relief.contours) {
    reliefLayers.push(
      buildContourLayer(RELIEF_CONTOUR_LAYER_ID, theme, false),
      buildContourLayer(RELIEF_CONTOUR_MAJOR_LAYER_ID, theme, true),
    );
  }

  const anchorIndex = style.layers.findIndex(
    (layer) => layer.id === RELIEF_ANCHOR_LAYER_ID,
  );
  const insertAt = anchorIndex === -1 ? style.layers.length : anchorIndex;
  const layers = [
    ...style.layers.slice(0, insertAt),
    ...reliefLayers,
    ...style.layers.slice(insertAt),
  ];

  return {
    ...style,
    sources: {
      ...style.sources,
      ...(buildReliefSources(relief) as StyleSpecification["sources"]),
    },
    layers,
  };
}
