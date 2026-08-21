import type { PosterForm } from "@/features/poster/application/posterReducer";
import type { Preset, PresetLayers, PresetValues } from "../domain/types";

/**
 * Maps a preset onto poster form fields, and reads the four dimensions
 * back out of the form. The Presets section uses both directions: one
 * to apply a card, the other to find the card that the poster shows.
 *
 * The custom colors travel beside the form, because `customColors`
 * lives in `PosterState` and not in `PosterForm`.
 */

/** The layer token of a preset, and the form field it sets. */
const LAYER_FIELDS: { key: keyof PresetLayers; field: keyof PosterForm }[] = [
  { key: "landcover", field: "includeLandcover" },
  { key: "buildings", field: "includeBuildings" },
  { key: "water", field: "includeWater" },
  { key: "parks", field: "includeParks" },
  { key: "roads", field: "includeRoads" },
  { key: "rail", field: "includeRail" },
  { key: "aeroway", field: "includeAeroway" },
];

export function presetFormFields(preset: Preset): Partial<PosterForm> {
  const fields: Partial<PosterForm> = {
    theme: preset.theme,
    plateWeight: String(preset.plate.weight),
    plateFills: preset.plate.fills,
    plateCasings: preset.plate.casings,
    sheetMat: String(Math.round(preset.sheet.mat * 100)),
    sheetText: preset.sheet.textPosition,
    sheetMask: preset.sheet.mask,
    reliefContours: preset.relief.contours,
    reliefInterval: preset.relief.contourInterval,
    reliefHillshade: preset.relief.hillshade,
    reliefStrength: preset.relief.hillshadeStrength,
  };

  const layerFields = fields as Record<string, boolean>;
  for (const { key, field } of LAYER_FIELDS) {
    layerFields[field] = preset.layers[key];
  }

  return fields;
}

export function presetValuesFromForm(
  form: PosterForm,
  customColors: Record<string, string>,
): PresetValues {
  const layerFields = form as unknown as Record<string, boolean>;
  const layers = {} as PresetLayers;
  for (const { key, field } of LAYER_FIELDS) {
    layers[key] = Boolean(layerFields[field]);
  }

  return {
    theme: form.theme,
    colors: customColors,
    plate: {
      weight: Number(form.plateWeight),
      fills: form.plateFills as PresetValues["plate"]["fills"],
      casings: Boolean(form.plateCasings),
    },
    sheet: {
      mat: Number(form.sheetMat) / 100,
      textPosition: form.sheetText as PresetValues["sheet"]["textPosition"],
      mask: form.sheetMask as PresetValues["sheet"]["mask"],
    },
    layers,
    relief: {
      contours: Boolean(form.reliefContours),
      contourInterval: form.reliefInterval,
      hillshade: Boolean(form.reliefHillshade),
      hillshadeStrength: form.reliefStrength as
        PresetValues["relief"]["hillshadeStrength"],
    },
  };
}
