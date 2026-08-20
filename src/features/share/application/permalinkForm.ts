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

  fields.displayCity = permalink.city ?? "";
  fields.displayCountry = permalink.country ?? "";
  fields.location =
    [permalink.city, permalink.country].filter(Boolean).join(", ") ||
    `${fields.latitude}, ${fields.longitude}`;

  return fields;
}
