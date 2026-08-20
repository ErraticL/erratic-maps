/**
 * Browser adapter for the permalink codec: reads the hash the page
 * loaded with (snapshotted once, so later hash writes cannot change
 * the startup answer) and writes the current poster state back with
 * history.replaceState, which keeps the back button unaffected.
 */

import {
  buildPermalinkHash,
  parsePermalinkHash,
  type PermalinkData,
} from "../domain/permalink";

let startupSnapshot: PermalinkData | null | undefined;

export function readStartupPermalink(): PermalinkData | null {
  if (startupSnapshot === undefined) {
    startupSnapshot =
      typeof window === "undefined"
        ? null
        : parsePermalinkHash(window.location.hash);
  }
  return startupSnapshot;
}

export function writePermalink(data: PermalinkData): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lon)) return;
  const hash = buildPermalinkHash(data);
  if (window.location.hash === hash) return;
  window.history.replaceState(null, "", hash);
}
