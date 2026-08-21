/**
 * Export resolution: how many pixels an export holds.
 *
 * A poster has two kinds of size. A print layout states centimeters, so
 * its resolution is a print resolution in dots per inch. A pixel layout
 * (social, wallpaper, web) states a pixel size, so its resolution is the
 * named size itself, one or two times.
 *
 * Release 0.7 exported every poster through one cap of 8.5 megapixels
 * and 4096 pixels per side. That cap is the tier "Standard" now. The
 * other tiers raise it, up to the limit the device reports.
 *
 * The plan is docs/roadmap/resolution.md.
 */

/** How a layout states its size. */
export type LayoutKind = "print" | "pixel";

export type ResolutionTierId =
  | "standard"
  | "dpi150"
  | "dpi200"
  | "dpi300"
  | "native"
  | "native2x";

export interface ResolutionTier {
  id: ResolutionTierId;
  kind: LayoutKind;
  label: string;
  /** The print resolution the tier asks for. A pixel tier ignores it. */
  dpi: number;
  /** How many times the named pixel size a pixel tier exports. */
  scale: number;
  /** True while the tier keeps the caps of release 0.7. */
  standard: boolean;
}

export const printTiers: ResolutionTier[] = [
  {
    id: "standard",
    kind: "print",
    label: "Standard",
    dpi: 300,
    scale: 1,
    standard: true,
  },
  {
    id: "dpi150",
    kind: "print",
    label: "150 DPI",
    dpi: 150,
    scale: 1,
    standard: false,
  },
  {
    id: "dpi200",
    kind: "print",
    label: "200 DPI",
    dpi: 200,
    scale: 1,
    standard: false,
  },
  {
    id: "dpi300",
    kind: "print",
    label: "300 DPI",
    dpi: 300,
    scale: 1,
    standard: false,
  },
];

export const pixelTiers: ResolutionTier[] = [
  {
    // Every named pixel size in src/data/layouts.json fits the caps of
    // release 0.7; the largest is the 4K wallpaper with 8.3 megapixels
    // and 3840 pixels per side. The tier therefore keeps those caps and
    // still reaches the named size.
    id: "native",
    kind: "pixel",
    label: "Named size",
    dpi: 0,
    scale: 1,
    standard: true,
  },
  {
    id: "native2x",
    kind: "pixel",
    label: "2x",
    dpi: 0,
    scale: 2,
    standard: false,
  },
];

export function tiersFor(kind: LayoutKind): ResolutionTier[] {
  return kind === "pixel" ? pixelTiers : printTiers;
}

/**
 * The tier that keeps the caps of release 0.7. The layered SVG export
 * always takes it, because it embeds one raster per layer.
 */
export function baseTierFor(kind: LayoutKind): ResolutionTier {
  return kind === "pixel" ? pixelTiers[0] : printTiers[0];
}

export function findTier(
  kind: LayoutKind,
  tierId: string,
): ResolutionTier | null {
  return tiersFor(kind).find((tier) => tier.id === tierId) ?? null;
}

/* ────── The stored setting ────── */

/**
 * The choice of the visitor, one value per layout kind. A print layout
 * and a pixel layout hold their own tier, so a trip from a poster to a
 * wallpaper and back keeps both answers.
 *
 * A field stays empty until the visitor chooses. The empty field means
 * "take the default of this device", and the default follows the memory
 * budget and the size of the poster.
 */
export interface ResolutionSetting {
  print?: ResolutionTierId;
  pixel?: ResolutionTierId;
}

export const EMPTY_RESOLUTION_SETTING: ResolutionSetting = {};

export function readSetting(
  setting: ResolutionSetting,
  kind: LayoutKind,
): ResolutionTierId | null {
  const value = kind === "pixel" ? setting.pixel : setting.print;
  return value ?? null;
}

export function writeSetting(
  setting: ResolutionSetting,
  kind: LayoutKind,
  tierId: ResolutionTierId,
): ResolutionSetting {
  return kind === "pixel"
    ? { ...setting, pixel: tierId }
    : { ...setting, print: tierId };
}

export function normalizeSetting(value: unknown): ResolutionSetting {
  if (!value || typeof value !== "object") {
    return EMPTY_RESOLUTION_SETTING;
  }
  const raw = value as Record<string, unknown>;
  const print = findTier("print", String(raw.print ?? ""));
  const pixel = findTier("pixel", String(raw.pixel ?? ""));
  const setting: ResolutionSetting = {};
  if (print) {
    setting.print = print.id;
  }
  if (pixel) {
    setting.pixel = pixel.id;
  }
  return setting;
}

/* ────── The limits of the device ────── */

export interface CanvasLimits {
  /** The hard limit per side, in pixels. */
  maxSide: number;
  /** The hard limit of the whole canvas, in pixels. */
  maxPixels: number;
}

export interface DeviceCeiling {
  /** WebGL MAX_RENDERBUFFER_SIZE, the hard limit per side. */
  maxSide: number;
  /** What the memory of the device holds without a risk, in pixels. */
  budgetPixels: number;
}

/**
 * The budget of a device that reports 8 GB or more. An A0 poster at
 * 300 DPI holds about 140 megapixels.
 */
export const BUDGET_LARGE_PIXELS = 140_000_000;

/**
 * The budget of a device that reports 4 GB, and of a desktop that
 * reports nothing. An A2 poster at 300 DPI holds about 35 megapixels.
 */
export const BUDGET_MEDIUM_PIXELS = 35_000_000;

/* ────── The size of the file ────── */

/**
 * Estimates the size of the PNG file, in bytes.
 *
 * The two numbers come from the measurement session of 2026-08-21:
 * A4 13.5 MB, A3 22.2 MB, A2 35.4 MB, A1 55.7 MB and A0 85.4 MB. A PNG
 * of a map does not grow with the pixel count one to one, because a
 * bigger canvas holds longer runs of one color. The fit holds every
 * measured value inside six percent. The readout says "about".
 */
const BYTES_PER_MEGAPIXEL = 3_280_000;
const FILE_SIZE_EXPONENT = 0.67;

export function estimateFileBytes(width: number, height: number): number {
  const megapixels = (width * height) / 1_000_000;
  if (megapixels <= 0) {
    return 0;
  }
  return BYTES_PER_MEGAPIXEL * Math.pow(megapixels, FILE_SIZE_EXPONENT);
}

export function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1_000_000;
  if (megabytes >= 10) {
    return `${Math.round(megabytes)} MB`;
  }
  return `${Math.round(megabytes * 10) / 10} MB`;
}

/**
 * The one line that reports the result of the current choice, for
 * example "A2 - 4961 x 7016 px - about 35 MB". The download dialog and
 * the Layout section both show it, and both read the numbers the export
 * writes.
 */
export function formatResolutionReadout(
  layoutName: string,
  width: number,
  height: number,
): string {
  const name = layoutName.trim();
  const size = `${width} x ${height} px`;
  const file = `about ${formatFileSize(estimateFileBytes(width, height))}`;
  return name ? `${name} - ${size} - ${file}` : `${size} - ${file}`;
}

/** The abort message of decision 4 in docs/roadmap/resolution.md. */
export const MEMORY_LIMIT_MESSAGE =
  "This resolution did not fit in memory on this device. Choose a lower one.";

/** The warning every option above the budget of the device carries. */
export const ABOVE_BUDGET_WARNING = "may fail on this device";

/** The note the dialog shows while a tier above Standard is chosen. */
export const SVG_STANDARD_NOTE = "SVG exports at standard resolution.";
