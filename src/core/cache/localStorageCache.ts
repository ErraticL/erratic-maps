import type { ICache } from "./ports";
import { APP_VERSION } from "@/core/config";

const CACHE_PREFIX = `erratic-maps:${APP_VERSION}:`;

/**
 * A setting of the device is not cached data of one release. It must
 * outlive a deploy, so its keys carry no version.
 */
const SETTINGS_PREFIX = "erratic-maps:settings:";

const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function createStore(prefix: string): ICache {
  return {
    read<T = unknown>(
      key: string,
      maxAgeMs: number = DEFAULT_MAX_AGE_MS,
    ): T | null {
      if (typeof window === "undefined" || !window.localStorage) {
        return null;
      }

      try {
        const cacheKey = `${prefix}${key}`;
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) {
          return null;
        }

        const payload = JSON.parse(raw);
        if (
          !payload ||
          typeof payload !== "object" ||
          typeof payload.ts !== "number"
        ) {
          window.localStorage.removeItem(cacheKey);
          return null;
        }

        if (Date.now() - payload.ts > maxAgeMs) {
          window.localStorage.removeItem(cacheKey);
          return null;
        }

        return (payload.data as T) ?? null;
      } catch {
        return null;
      }
    },

    write(key: string, data: unknown): void {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }

      try {
        const cacheKey = `${prefix}${key}`;
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({ ts: Date.now(), data }),
        );
      } catch {
        // Ignore localStorage errors (quota, private mode, etc.)
      }
    },
  };
}

/** Cached data of the running release. A version bump drops it. */
export const localStorageCache: ICache = createStore(CACHE_PREFIX);

/** Settings of this device. They survive a release. */
export const localSettingsStore: ICache = createStore(SETTINGS_PREFIX);
