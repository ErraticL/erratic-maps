import { useEffect } from "react";
import { CUSTOM_LAYOUT_ID } from "@/features/layout/domain/types";
import { layersOffTokens } from "@/features/share/application/permalinkForm";
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
  } = form;

  // The list of hidden layers is one string, so the effect below needs
  // one dependency for all seven switches.
  const layersOff = layersOffTokens(
    form as unknown as Record<string, unknown>,
  ).join(",");

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
