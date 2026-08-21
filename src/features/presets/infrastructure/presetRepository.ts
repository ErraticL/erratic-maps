import presetsManifest from "@/data/presets.json";
import { themeNames } from "@/features/theme/infrastructure/themeRepository";
import type { Preset, RawPreset } from "../domain/types";
import { normalizePreset } from "../domain/types";

/**
 * Loads the curated preset list. A preset whose theme the app does not
 * know is dropped, so a typing mistake in the JSON removes one card
 * instead of breaking the section. The file order is the card order,
 * and the first entry is the default poster.
 */
const rawPresets = Array.isArray(
  (presetsManifest as { presets?: unknown }).presets,
)
  ? ((presetsManifest as { presets: RawPreset[] }).presets)
  : [];

export const presets: Preset[] = rawPresets
  .map((raw) => normalizePreset(raw))
  .filter((preset): preset is Preset => preset !== null)
  .filter((preset) => themeNames.includes(preset.theme));

/** The preset that the app opens with. It equals the default poster. */
export const DEFAULT_PRESET_ID = presets[0]?.id ?? "";

export function getPreset(presetId: string): Preset | undefined {
  return presets.find((preset) => preset.id === presetId);
}

/** Where the card pictures live, relative to the site root. */
export const PRESET_CARD_BASE = "/assets/presets/";
