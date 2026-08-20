import { useEffect } from "react";
import { CUSTOM_LAYOUT_ID } from "@/features/layout/domain/types";
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
  } = form;

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
