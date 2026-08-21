/**
 * The sheet: how the poster composes the map, the mat and the text.
 *
 * This module is pure. It takes the sheet size and the sheet settings
 * and it returns geometry. Four consumers read that geometry and must
 * agree pixel for pixel: the DOM preview, the MapLibre padding, the
 * canvas compositor and the layered SVG exporter.
 *
 * The map always covers the whole sheet. The mat paints over it and
 * leaves a hole. `map.setPadding` then moves the chosen location to
 * the center of that hole, so the poster shows the place the visitor
 * asked for and not the geometric center of the paper.
 */

export type TextPosition = "bottom" | "top" | "none";
export type SheetMask = "none" | "circle" | "arch" | "rounded";

export interface Sheet {
  /** The width of the mat, as a fraction of the short side of the sheet. */
  mat: number;
  /** Where the text block sits. */
  textPosition: TextPosition;
  /** The shape of the map hole. */
  mask: SheetMask;
}

export const MIN_MAT = 0;
export const MAX_MAT = 0.2;

/** The sheet of release 0.7: no mat, text at the bottom, no mask. */
export const DEFAULT_SHEET: Sheet = {
  mat: 0,
  textPosition: "bottom",
  mask: "none",
};

/** The share of the sheet height that the text block takes. */
export const TEXT_BLOCK_RATIO = 0.25;

/**
 * Where the ink of the text block starts and ends inside the block.
 * The block reserves space above the city line and below the
 * coordinate line, so these two numbers are not 0 and 1.
 */
const TEXT_INK_TOP = 0.28;
const TEXT_INK_BOTTOM = 0.8;

/** How far a gradient fade reaches into the hole. */
const FADE_RATIO = 0.25;

/** The corner radius of the "rounded" mask, per short side of the hole. */
const ROUNDED_RADIUS_RATIO = 0.06;

/** The choices that the Composition controls offer. */
export const textPositionOptions: { id: TextPosition; label: string }[] = [
  { id: "bottom", label: "Bottom" },
  { id: "top", label: "Top" },
  { id: "none", label: "None" },
];

export const maskOptions: { id: SheetMask; label: string }[] = [
  { id: "none", label: "Full" },
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Circle" },
  { id: "arch", label: "Arch" },
];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SheetGeometry {
  width: number;
  height: number;
  /** The rectangle that the map fills. The mask cuts its shape from it. */
  hole: Rect;
  /** True while the mat covers any part of the sheet. */
  hasMat: boolean;
  /** The outline of the hole as an SVG path, in sheet pixels. */
  holePath: string;
  /**
   * The MapLibre padding, as a fraction of the sheet. The left and the
   * right value are fractions of the width, the top and the bottom
   * value are fractions of the height. Each consumer multiplies them
   * by the size of its own map container.
   */
  padding: SheetEdges;
  /**
   * How far the center of the hole sits from the center of the sheet,
   * as a fraction of the sheet. The export projection adds it, because
   * MapLibre draws the map center at the center of the padded box.
   */
  centerOffset: { x: number; y: number };
  /** The box that holds the poster text, or null while the text is off. */
  text: Rect | null;
  /** The height of each gradient fade, in sheet pixels. Zero means off. */
  fades: { top: number; bottom: number };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampMat(value: number): number {
  return clampNumber(value, MIN_MAT, MAX_MAT);
}

export function isTextPosition(value: unknown): value is TextPosition {
  return value === "bottom" || value === "top" || value === "none";
}

export function isSheetMask(value: unknown): value is SheetMask {
  return (
    value === "none" ||
    value === "circle" ||
    value === "arch" ||
    value === "rounded"
  );
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Builds the outline of the hole as an SVG path. Both the DOM overlay
 * and the canvas compositor read this one string, so the preview and
 * the file cannot drift apart.
 */
export function holePathFor(hole: Rect, mask: SheetMask): string {
  const { x, y, width: w, height: h } = hole;
  const right = x + w;
  const bottom = y + h;

  if (mask === "circle") {
    const radius = Math.min(w, h) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return [
      `M ${round(cx - radius)} ${round(cy)}`,
      `A ${round(radius)} ${round(radius)} 0 1 0 ${round(cx + radius)} ${round(cy)}`,
      `A ${round(radius)} ${round(radius)} 0 1 0 ${round(cx - radius)} ${round(cy)}`,
      "Z",
    ].join(" ");
  }

  if (mask === "arch") {
    // A window: a half circle on top of a rectangle. The radius never
    // takes more than 60 % of the height, so a wide hole keeps a body.
    const radius = Math.min(w / 2, h * 0.6);
    return [
      `M ${round(x)} ${round(bottom)}`,
      `L ${round(x)} ${round(y + radius)}`,
      `A ${round(w / 2)} ${round(radius)} 0 0 1 ${round(right)} ${round(y + radius)}`,
      `L ${round(right)} ${round(bottom)}`,
      "Z",
    ].join(" ");
  }

  if (mask === "rounded") {
    const radius = Math.min(w, h) * ROUNDED_RADIUS_RATIO;
    return [
      `M ${round(x + radius)} ${round(y)}`,
      `L ${round(right - radius)} ${round(y)}`,
      `A ${round(radius)} ${round(radius)} 0 0 1 ${round(right)} ${round(y + radius)}`,
      `L ${round(right)} ${round(bottom - radius)}`,
      `A ${round(radius)} ${round(radius)} 0 0 1 ${round(right - radius)} ${round(bottom)}`,
      `L ${round(x + radius)} ${round(bottom)}`,
      `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x)} ${round(bottom - radius)}`,
      `L ${round(x)} ${round(y + radius)}`,
      `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + radius)} ${round(y)}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${round(x)} ${round(y)}`,
    `L ${round(right)} ${round(y)}`,
    `L ${round(right)} ${round(bottom)}`,
    `L ${round(x)} ${round(bottom)}`,
    "Z",
  ].join(" ");
}

/**
 * Turns the sheet size and the sheet settings into geometry.
 *
 * The mat insets every edge by the same amount. The edge that carries
 * the text takes more, so the text can move off the map and onto the
 * mat. That extra inset grows with the mat and stops when the text
 * block fits, which keeps the control continuous: at a mat of zero the
 * poster is the poster of release 0.7, and no edge jumps as the mat
 * grows.
 */
export function computeSheetGeometry(
  width: number,
  height: number,
  sheet: Sheet,
): SheetGeometry {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const shortSide = Math.min(safeWidth, safeHeight);
  const matPx = clampMat(sheet.mat) * shortSide;
  const textPosition = isTextPosition(sheet.textPosition)
    ? sheet.textPosition
    : DEFAULT_SHEET.textPosition;
  const mask = isSheetMask(sheet.mask) ? sheet.mask : DEFAULT_SHEET.mask;

  const textBlockHeight = TEXT_BLOCK_RATIO * safeHeight;
  const textEdgeInset =
    textPosition === "none"
      ? matPx
      : Math.max(matPx, Math.min(matPx * 2, textBlockHeight));

  const insetTop = textPosition === "top" ? textEdgeInset : matPx;
  const insetBottom = textPosition === "bottom" ? textEdgeInset : matPx;

  const hole: Rect = {
    x: matPx,
    y: insetTop,
    width: Math.max(1, safeWidth - matPx * 2),
    height: Math.max(1, safeHeight - insetTop - insetBottom),
  };

  const padding: SheetEdges = {
    top: insetTop / safeHeight,
    right: matPx / safeWidth,
    bottom: insetBottom / safeHeight,
    left: matPx / safeWidth,
  };

  const centerOffset = {
    x: (padding.left - padding.right) / 2,
    y: (padding.top - padding.bottom) / 2,
  };

  let text: Rect | null = null;
  if (textPosition === "bottom") {
    text = {
      x: 0,
      y: safeHeight - textBlockHeight,
      width: safeWidth,
      height: textBlockHeight,
    };
  } else if (textPosition === "top") {
    text = { x: 0, y: 0, width: safeWidth, height: textBlockHeight };
  }

  // Decision 17: a fade exists only where a text block draws over the
  // map hole. A wide mat lifts the text off the map, and the fade goes
  // with it.
  const holeTop = hole.y;
  const holeBottom = hole.y + hole.height;
  const fadeSize = FADE_RATIO * hole.height;
  let fadeTop = 0;
  let fadeBottom = 0;
  if (text && textPosition === "bottom") {
    const inkTop = text.y + TEXT_INK_TOP * text.height;
    if (inkTop < holeBottom) {
      fadeBottom = fadeSize;
    }
  }
  if (text && textPosition === "top") {
    const inkBottom = text.y + TEXT_INK_BOTTOM * text.height;
    if (inkBottom > holeTop) {
      fadeTop = fadeSize;
    }
  }

  return {
    width: safeWidth,
    height: safeHeight,
    hole,
    hasMat: matPx > 0 || insetTop > 0 || insetBottom > 0 || mask !== "none",
    holePath: holePathFor(hole, mask),
    padding,
    centerOffset,
    text,
    fades: { top: fadeTop, bottom: fadeBottom },
  };
}
