import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";
import type { Plate } from "@/features/map/domain/plate";
import { blendHex } from "@/shared/utils/color";

/**
 * Applies the plate (the drawing rules) to a generated map style.
 *
 * The transform runs after `generateMapStyle`, so the upstream style
 * generator stays close to upstream and a merge stays cheap. The
 * export map reads its style from the live map, so the export needs no
 * change of its own.
 *
 * The outline mode does not use `fill-outline-color`. That property
 * draws a fixed one pixel hairline that ignores the weight control and
 * the over-zoom of the poster map. This module adds a real line layer
 * for every polygon fill instead.
 */

/** The polygon fills that the outline mode replaces with a line layer. */
const OUTLINE_FILL_LAYER_IDS = [
  "landcover",
  "park",
  "water",
  "aeroway",
  "building",
];

const OUTLINE_LAYER_SUFFIX = "-outline";
const CASING_LAYER_SUFFIX = "-casing";

/**
 * How far an outline color moves from its fill color towards the text
 * color. A fill color alone is too close to the land color to read as
 * a thin line.
 */
const OUTLINE_INK_MIX = 0.45;

const OUTLINE_WIDTH_STOPS: [number, number][] = [
  [8, 0.4],
  [12, 0.7],
  [16, 1],
  [18, 1.3],
];

/**
 * The same width boost `maplibreStyle` applies: the over-zoomed canvas
 * is scaled down for display, which shrinks every stroke.
 */
const OVERZOOM_LINE_WIDTH_SCALE = Math.pow(MAP_OVERZOOM_SCALE, 0.8);

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function roundWidth(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function outlineWidthExpr(weight: number): unknown {
  const flat = OUTLINE_WIDTH_STOPS.flatMap(([zoom, width]) => [
    zoom,
    roundWidth(width * OVERZOOM_LINE_WIDTH_SCALE * weight),
  ]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

/**
 * Multiplies a `line-width` value by the weight factor.
 *
 * The stops of a zoom interpolation are scaled one by one. MapLibre
 * allows a `zoom` expression only at the top level of a property, so
 * wrapping the interpolation in a multiplication would be invalid.
 */
function scaleWidthValue(value: unknown, factor: number): unknown {
  if (factor === 1) {
    return value;
  }
  if (typeof value === "number") {
    return roundWidth(value * factor);
  }
  if (!Array.isArray(value) || value[0] !== "interpolate") {
    return value;
  }
  // ["interpolate", ["linear"], ["zoom"], zoom0, width0, zoom1, width1, ...]
  const scaled = [...value];
  for (let index = 4; index < scaled.length; index += 2) {
    const width = Number(scaled[index]);
    if (Number.isFinite(width)) {
      scaled[index] = roundWidth(width * factor);
    }
  }
  return scaled;
}

/**
 * Moves every color literal towards the text color. The value is a hex
 * string, or the expression that colors the buildings by height. Every
 * other part of an expression stays as it is.
 */
function blendColorValue(value: unknown, ink: string, mix: number): unknown {
  if (typeof value === "string") {
    return HEX_COLOR.test(value.trim()) ? blendHex(value, ink, mix) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => blendColorValue(item, ink, mix));
  }
  return value;
}

function isHidden(layer: LayerSpecification): boolean {
  const layout = (layer as Record<string, any>).layout as
    | Record<string, unknown>
    | undefined;
  return String(layout?.visibility ?? "visible") === "none";
}

function withVisibility(
  layer: Record<string, any>,
  visible: boolean,
): Record<string, any> {
  return {
    ...layer,
    layout: { ...(layer.layout ?? {}), visibility: visible ? "visible" : "none" },
  };
}

/**
 * Builds the line layer that draws the border of a polygon fill. The
 * layer always exists, hidden while the plate uses solid fills, so the
 * set of layer ids never changes and the preview can keep updating the
 * map without a full style reload.
 */
function buildOutlineLayer(
  fillLayer: LayerSpecification,
  theme: ResolvedTheme,
  plate: Plate,
): LayerSpecification {
  const source = fillLayer as Record<string, any>;
  const fillColor = source.paint?.["fill-color"];

  return {
    id: `${fillLayer.id}${OUTLINE_LAYER_SUFFIX}`,
    type: "line",
    source: source.source,
    "source-layer": source["source-layer"],
    ...(source.filter ? { filter: source.filter } : {}),
    ...(source.minzoom === undefined ? {} : { minzoom: source.minzoom }),
    ...(source.maxzoom === undefined ? {} : { maxzoom: source.maxzoom }),
    paint: {
      "line-color": blendColorValue(fillColor, theme.ui.text, OUTLINE_INK_MIX),
      "line-width": outlineWidthExpr(plate.weight),
    },
    layout: {
      visibility:
        plate.fills === "outline" && !isHidden(fillLayer) ? "visible" : "none",
      "line-join": "round",
    },
  } as LayerSpecification;
}

function transformLayer(
  layer: LayerSpecification,
  plate: Plate,
): LayerSpecification {
  let next = layer as Record<string, any>;

  if (next.type === "line" && next.paint?.["line-width"] !== undefined) {
    next = {
      ...next,
      paint: {
        ...next.paint,
        "line-width": scaleWidthValue(next.paint["line-width"], plate.weight),
      },
    };
  }

  if (!plate.casings && next.id.endsWith(CASING_LAYER_SUFFIX)) {
    next = withVisibility(next, false);
  }

  if (
    plate.fills === "outline" &&
    next.type === "fill" &&
    OUTLINE_FILL_LAYER_IDS.includes(next.id)
  ) {
    next = withVisibility(next, false);
  }

  return next as LayerSpecification;
}

export function applyPlate(
  style: StyleSpecification,
  theme: ResolvedTheme,
  plate: Plate,
): StyleSpecification {
  const layers: LayerSpecification[] = [];

  for (const layer of style.layers) {
    layers.push(transformLayer(layer, plate));
    if (OUTLINE_FILL_LAYER_IDS.includes(layer.id)) {
      layers.push(buildOutlineLayer(layer, theme, plate));
    }
  }

  return { ...style, layers };
}
