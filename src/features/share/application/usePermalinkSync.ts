import { useEffect } from "react";
import { CUSTOM_LAYOUT_ID } from "@/features/layout/domain/types";
import { layersOffTokens } from "@/features/share/application/permalinkForm";
import { encodeCustomColors } from "@/features/theme/domain/colorCodec";
import type { PermalinkData } from "@/features/share/domain/permalink";
import {
  readCurrentPermalink,
  writePermalink,
} from "@/features/share/infrastructure/permalinkLocation";

interface PermalinkFormSlice {
  latitude: string;
  longitude: string;
  distance: string;
  theme: string;
  layout: string;
  width: string;
  height: string;
  displayCity: string;
  displayCountry: string;
  plateWeight: string;
  plateFills: string;
  plateCasings: boolean;
  reliefContours: boolean;
  reliefInterval: string;
  reliefHillshade: boolean;
  reliefStrength: string;
  sheetMat: string;
  sheetText: string;
  sheetMask: string;
  includeLandcover: boolean;
  includeBuildings: boolean;
  includeWater: boolean;
  includeParks: boolean;
  includeRoads: boolean;
  includeRail: boolean;
  includeAeroway: boolean;
}

const WRITE_DEBOUNCE_MS = 400;

/**
 * Mirrors the shareable poster state into the URL hash (debounced),
 * so the address bar is always a working permalink — and applies a
 * permalink that arrives while the app is open (pasted URL, or
 * back/forward across hash entries). The two directions cannot loop:
 * our own writes go through history.replaceState, which never fires
 * hashchange; only external hash changes fire it.
 */
export function usePermalinkSync(
  form: PermalinkFormSlice,
  customColors: Record<string, string>,
  onExternalPermalink: (data: PermalinkData) => void,
): void {
  const {
    latitude,
    longitude,
    distance,
    theme,
    layout,
    width,
    height,
    displayCity,
    displayCountry,
    plateWeight,
    plateFills,
    plateCasings,
    reliefContours,
    reliefInterval,
    reliefHillshade,
    reliefStrength,
    sheetMat,
    sheetText,
    sheetMask,
  } = form;

  // The list of hidden layers is one string, so the effect below needs
  // one dependency for all seven switches.
  const layersOff = layersOffTokens(
    form as unknown as Record<string, unknown>,
  ).join(",");
  // The custom colors are an object, and a new object arrives on every
  // color change. The token is a string, so the effect compares values
  // and not identities.
  const colors = encodeCustomColors(customColors);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writePermalink({
        lat: Number(latitude),
        lon: Number(longitude),
        distanceMeters: Number(distance) || undefined,
        themeId: theme || undefined,
        layoutId: layout || undefined,
        ...(layout === CUSTOM_LAYOUT_ID
          ? {
              widthCm: Number(width) || undefined,
              heightCm: Number(height) || undefined,
            }
          : {}),
        city: displayCity || undefined,
        country: displayCountry || undefined,
        plateWeight: Number(plateWeight) || undefined,
        plateFills: plateFills || undefined,
        plateCasings: Boolean(plateCasings),
        contourInterval: reliefContours ? reliefInterval : undefined,
        hillshadeStrength: reliefHillshade ? reliefStrength : undefined,
        matPercent: Number(sheetMat) || undefined,
        textPosition: sheetText || undefined,
        sheetMask: sheetMask || undefined,
        colors: colors || undefined,
        layersOff: layersOff ? layersOff.split(",") : undefined,
      });
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    latitude,
    longitude,
    distance,
    theme,
    layout,
    width,
    height,
    displayCity,
    displayCountry,
    plateWeight,
    plateFills,
    plateCasings,
    reliefContours,
    reliefInterval,
    reliefHillshade,
    reliefStrength,
    sheetMat,
    sheetText,
    sheetMask,
    colors,
    layersOff,
  ]);

  useEffect(() => {
    const handleHashChange = () => {
      const data = readCurrentPermalink();
      if (data) onExternalPermalink(data);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [onExternalPermalink]);
}
