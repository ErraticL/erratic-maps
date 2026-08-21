/**
 * A preset: one named value for all four dimensions of the poster.
 *
 * The four dimensions are the theme (colors), the plate (drawing
 * rules), the sheet (composition) and the layers (content, relief
 * included). A preset is a starting point. After a click, every
 * dimension stays editable on its own, and the permalink carries the
 * resulting values, never the name of the preset.
 *
 * A preset in the JSON file names only the values that differ from the
 * default poster. `normalizePreset` fills in the rest. That is the same
 * rule the permalink codec follows: a missing value means the default
 * value.
 */

import type { Plate } from "@/features/map/domain/plate";
import {
  DEFAULT_PLATE,
  clampPlateWeight,
  isPlateFills,
} from "@/features/map/domain/plate";
import type { Relief } from "@/features/map/domain/relief";
import {
  DEFAULT_RELIEF,
  isContourInterval,
  isHillshadeStrength,
} from "@/features/map/domain/relief";
import type { Sheet } from "@/features/poster/domain/sheet";
import {
  DEFAULT_SHEET,
  clampMat,
  isSheetMask,
  isTextPosition,
} from "@/features/poster/domain/sheet";
import { DISPLAY_PALETTE_KEYS } from "@/features/theme/domain/types";

/** The seven content switches that a preset sets. */
export interface PresetLayers {
  landcover: boolean;
  buildings: boolean;
  water: boolean;
  parks: boolean;
  roads: boolean;
  rail: boolean;
  aeroway: boolean;
}

/** Every layer is on in the default poster. */
export const DEFAULT_PRESET_LAYERS: PresetLayers = {
  landcover: true,
  buildings: true,
  water: true,
  parks: true,
  roads: true,
  rail: true,
  aeroway: true,
};

/** The four dimensions, without the name and the card of a preset. */
export interface PresetValues {
  /** The id of the theme. */
  theme: string;
  /** Colors that override the theme, keyed by palette path. */
  colors: Record<string, string>;
  plate: Plate;
  sheet: Sheet;
  layers: PresetLayers;
  relief: Relief;
}

export interface Preset extends PresetValues {
  id: string;
  name: string;
  description: string;
  /** The file name of the card picture in public/assets/presets. */
  card: string;
}

/** The shape that presets.json holds. Every dimension is optional. */
export interface RawPreset {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  theme?: unknown;
  colors?: unknown;
  plate?: unknown;
  /** The mat is a PERCENT here, so the file stays readable. */
  sheet?: unknown;
  layers?: unknown;
  relief?: unknown;
}

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeColors(value: unknown): Record<string, string> {
  const raw = asRecord(value);
  const colors: Record<string, string> = {};
  for (const key of DISPLAY_PALETTE_KEYS) {
    const color = raw[key];
    if (typeof color === "string" && hexColorPattern.test(color.trim())) {
      colors[key] = color.trim().toLowerCase();
    }
  }
  return colors;
}

function normalizePlate(value: unknown): Plate {
  const raw = asRecord(value);
  return {
    weight:
      typeof raw.weight === "number"
        ? clampPlateWeight(raw.weight)
        : DEFAULT_PLATE.weight,
    fills: isPlateFills(raw.fills) ? raw.fills : DEFAULT_PLATE.fills,
    casings:
      typeof raw.casings === "boolean" ? raw.casings : DEFAULT_PLATE.casings,
  };
}

function normalizeSheet(value: unknown): Sheet {
  const raw = asRecord(value);
  return {
    mat:
      typeof raw.mat === "number" ? clampMat(raw.mat / 100) : DEFAULT_SHEET.mat,
    textPosition: isTextPosition(raw.textPosition)
      ? raw.textPosition
      : DEFAULT_SHEET.textPosition,
    mask: isSheetMask(raw.mask) ? raw.mask : DEFAULT_SHEET.mask,
  };
}

function normalizeLayers(value: unknown): PresetLayers {
  const raw = asRecord(value);
  const layers = { ...DEFAULT_PRESET_LAYERS };
  for (const key of Object.keys(layers) as (keyof PresetLayers)[]) {
    if (typeof raw[key] === "boolean") layers[key] = raw[key] as boolean;
  }
  return layers;
}

function normalizeRelief(value: unknown): Relief {
  const raw = asRecord(value);
  return {
    contours: typeof raw.contours === "boolean" ? raw.contours : false,
    contourInterval: isContourInterval(raw.contourInterval)
      ? (raw.contourInterval as string)
      : DEFAULT_RELIEF.contourInterval,
    hillshade: typeof raw.hillshade === "boolean" ? raw.hillshade : false,
    hillshadeStrength: isHillshadeStrength(raw.hillshadeStrength)
      ? raw.hillshadeStrength
      : DEFAULT_RELIEF.hillshadeStrength,
  };
}

/** Fills every value the JSON entry leaves out with the default. */
export function normalizePreset(raw: RawPreset): Preset | null {
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const theme = typeof raw.theme === "string" ? raw.theme.trim() : "";
  if (!id || !theme) return null;

  return {
    id,
    name:
      typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id,
    description: typeof raw.description === "string" ? raw.description : "",
    card: `${id}.webp`,
    theme,
    colors: normalizeColors(raw.colors),
    plate: normalizePlate(raw.plate),
    sheet: normalizeSheet(raw.sheet),
    layers: normalizeLayers(raw.layers),
    relief: normalizeRelief(raw.relief),
  };
}

function sameColors(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every(
    (key) =>
      String(right[key] ?? "").toLowerCase() ===
      String(left[key]).toLowerCase(),
  );
}

/** True while both sides hold the same value in all four dimensions. */
export function samePresetValues(
  left: PresetValues,
  right: PresetValues,
): boolean {
  return (
    left.theme === right.theme &&
    sameColors(left.colors, right.colors) &&
    left.plate.weight === right.plate.weight &&
    left.plate.fills === right.plate.fills &&
    left.plate.casings === right.plate.casings &&
    // The mat compares as a percent, which is the unit of the control,
    // of the form field and of the permalink key.
    Math.round(left.sheet.mat * 100) === Math.round(right.sheet.mat * 100) &&
    left.sheet.textPosition === right.sheet.textPosition &&
    left.sheet.mask === right.sheet.mask &&
    (Object.keys(left.layers) as (keyof PresetLayers)[]).every(
      (key) => left.layers[key] === right.layers[key],
    ) &&
    left.relief.contours === right.relief.contours &&
    left.relief.hillshade === right.relief.hillshade &&
    // An interval or a strength counts only while its own switch is on.
    (!left.relief.contours ||
      left.relief.contourInterval === right.relief.contourInterval) &&
    (!left.relief.hillshade ||
      left.relief.hillshadeStrength === right.relief.hillshadeStrength)
  );
}

/**
 * Returns the preset that the poster shows right now, or null when the
 * visitor moved a control away from every preset. The Presets section
 * marks that card. A null answer means the poster carries edits, and
 * decision 19 asks for a confirmation in exactly that case.
 */
export function matchPresetId(
  presets: Preset[],
  values: PresetValues,
): string | null {
  const match = presets.find((preset) => samePresetValues(preset, values));
  return match ? match.id : null;
}
