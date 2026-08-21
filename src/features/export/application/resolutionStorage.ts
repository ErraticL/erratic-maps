import { localSettingsStore } from "@/core/cache/localStorageCache";
import {
  normalizeSetting,
  type ResolutionSetting,
} from "@/features/export/domain/resolution";

/**
 * Where the export resolution lives.
 *
 * The value describes the device, not the poster, so it stays out of
 * the permalink and out of the form. It sits in localStorage instead,
 * and the app reads it once at startup.
 */

const RESOLUTION_STORAGE_KEY = "erratic-maps.export.resolution";

/** One year, so the choice outlives the session. */
const RESOLUTION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function readStoredResolution(): ResolutionSetting {
  return normalizeSetting(
    localSettingsStore.read<unknown>(RESOLUTION_STORAGE_KEY, RESOLUTION_TTL_MS),
  );
}

export function writeStoredResolution(setting: ResolutionSetting): void {
  localSettingsStore.write(RESOLUTION_STORAGE_KEY, setting);
}
