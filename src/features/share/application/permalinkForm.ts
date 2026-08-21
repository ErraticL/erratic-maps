import type { PosterForm } from "@/features/poster/application/posterReducer";
import type { PermalinkData } from "@/features/share/domain/permalink";
import {
  MIN_DISTANCE_METERS,
  MAX_DISTANCE_METERS,
  MIN_POSTER_CM,
  MAX_POSTER_CM,
} from "@/core/config";
import { CUSTOM_LAYOUT_ID } from "@/features/layout/domain/types";
import { layoutOptions } from "@/features/layout/infrastructure/layoutRepository";
import { themeNames } from "@/features/theme/infrastructure/themeRepository";
import {
  clampPlateWeight,
  isPlateFills,
  DEFAULT_PLATE,
} from "@/features/map/domain/plate";

/**
 * The content layers that the `off` key of a permalink can name. Only
 * the switches with their own control in the Layers section appear
 * here, so the key stays short and readable.
 */
export const LAYER_SWITCH_TOKENS: {
  token: string;
  field: keyof PosterForm;
}[] = [
  { token: "landcover", field: "includeLandcover" },
  { token: "buildings", field: "includeBuildings" },
  { token: "water", field: "includeWater" },
  { token: "parks", field: "includeParks" },
  { token: "roads", field: "includeRoads" },
  { token: "rail", field: "includeRail" },
  { token: "aeroway", field: "includeAeroway" },
];

/** Lists the layer tokens that the poster hides right now. */
export function layersOffTokens(
  form: Record<string, unknown>,
): string[] {
  return LAYER_SWITCH_TOKENS.filter(({ field }) => !form[field]).map(
    ({ token }) => token,
  );
}

/**
 * Maps a parsed permalink onto poster form fields. Both consumers use
 * it: the startup hydration in PosterContext and the hashchange
 * handler for a permalink pasted into an open app. Every value is
 * validated against the same bounds and registries the UI uses; an
 * invalid value is dropped and the current form value stays.
 */
export function permalinkFormFields(
  permalink: PermalinkData,
): Partial<PosterForm> {
  const fields: Partial<PosterForm> = {
    latitude: permalink.lat.toFixed(6),
    longitude: permalink.lon.toFixed(6),
  };

  const distance = Number(permalink.distanceMeters);
  if (Number.isFinite(distance)) {
    fields.distance = String(
      Math.min(MAX_DISTANCE_METERS, Math.max(MIN_DISTANCE_METERS, distance)),
    );
  }

  if (permalink.themeId && themeNames.includes(permalink.themeId)) {
    fields.theme = permalink.themeId;
  }

  if (permalink.layoutId === CUSTOM_LAYOUT_ID) {
    const clampCm = (value: number | undefined) =>
      Number.isFinite(Number(value))
        ? String(
            Math.min(MAX_POSTER_CM, Math.max(MIN_POSTER_CM, Number(value))),
          )
        : undefined;
    fields.layout = CUSTOM_LAYOUT_ID;
    const width = clampCm(permalink.widthCm);
    const height = clampCm(permalink.heightCm);
    if (width) fields.width = width;
    if (height) fields.height = height;
  } else if (permalink.layoutId) {
    const option = layoutOptions.find((o) => o.id === permalink.layoutId);
    if (option) {
      fields.layout = option.id;
      fields.width = String(option.widthCm);
      fields.height = String(option.heightCm);
    }
  }

  // The plate and the layer switches follow the rule of the codec: a
  // missing key means the default value. A link therefore restores the
  // whole drawing, and does not keep a switch the previous poster had
  // turned off.
  fields.plateWeight = String(
    clampPlateWeight(Number(permalink.plateWeight ?? DEFAULT_PLATE.weight)),
  );
  fields.plateFills = isPlateFills(permalink.plateFills)
    ? permalink.plateFills
    : DEFAULT_PLATE.fills;
  fields.plateCasings = permalink.plateCasings ?? DEFAULT_PLATE.casings;

  const hiddenLayers = new Set(permalink.layersOff ?? []);
  const layerFields = fields as Record<string, boolean>;
  for (const { token, field } of LAYER_SWITCH_TOKENS) {
    layerFields[field] = !hiddenLayers.has(token);
  }

  fields.displayCity = permalink.city ?? "";
  fields.displayCountry = permalink.country ?? "";
  fields.location =
    [permalink.city, permalink.country].filter(Boolean).join(", ") ||
    `${fields.latitude}, ${fields.longitude}`;

  return fields;
}
