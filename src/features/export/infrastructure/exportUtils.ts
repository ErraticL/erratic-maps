import maplibregl, {
  type Map as MaplibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";

const EXPORT_MAP_TIMEOUT_MS = 15_000;

/**
 * Terrain needs more time than the vector map: the browser downloads
 * elevation tiles and a worker builds the contour lines from them.
 */
export const RELIEF_EXPORT_TIMEOUT_MS = 45_000;

/**
 * Waits for MapLibre to finish rendering (idle, no active movement).
 * Rejects if tiles don't settle within the timeout.
 */
export function waitForMapIdle(
  map: MaplibreMap,
  timeoutMs: number = EXPORT_MAP_TIMEOUT_MS,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Timed out while waiting for map tiles to render."));
    }, timeoutMs);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };

    if (map.loaded() && !map.isMoving()) {
      finish();
      return;
    }

    map.once("idle", finish);
  });
}

/* ────── Tile errors on the export map ────── */

/**
 * MapLibre treats a failed tile as a loaded tile: the map goes idle and
 * the export writes a hole into the poster. The export therefore counts
 * the tile errors of the export map and refuses to build a file when
 * any of them occurred.
 *
 * A 404 is not an error here. MapLibre reports no event for it and uses
 * the parent tile instead, which is the correct answer for a terrain
 * tile outside the coverage of the data set.
 */

export interface TileErrorReport {
  count: number;
  /** True when at least one failed tile belongs to the terrain. */
  terrain: boolean;
}

export interface TileErrorTracker {
  report(): TileErrorReport;
  /**
   * Rejects as soon as the map reports the first failed tile. The
   * export races it against the idle event, so a dead tile server
   * stops the export at once instead of after the whole timeout.
   */
  failure: Promise<never>;
  dispose(): void;
}

function tileErrorMessage(terrain: boolean): string {
  return terrain
    ? "Terrain data did not load. Try again, or turn relief off."
    : "Map tiles did not load. Please try the export again.";
}

/**
 * Counts the tile errors of a map until `dispose` is called.
 *
 * MapLibre bubbles a tile error from the source to the map and adds
 * the `sourceId` of the source on the way, so the id of the failed
 * source names the right message.
 */
export function trackTileErrors(
  map: MaplibreMap,
  reliefSourceIds: string[] = [],
): TileErrorTracker {
  let count = 0;
  let terrain = false;
  let rejectFailure: ((error: Error) => void) | null = null;

  const failure = new Promise<never>((_resolve, reject) => {
    rejectFailure = reject;
  });

  const handleError = (event: any) => {
    count += 1;
    if (reliefSourceIds.includes(String(event?.sourceId ?? ""))) {
      terrain = true;
    }
    rejectFailure?.(new Error(tileErrorMessage(terrain)));
    rejectFailure = null;
  };

  map.on("error", handleError);

  return {
    report: () => ({ count, terrain }),
    failure,
    dispose: () => {
      map.off("error", handleError);
      rejectFailure = null;
    },
  };
}

/**
 * Stops the export when the export map failed to load a tile. It
 * catches the errors that arrive together with the last tile, where
 * the idle event wins the race above.
 */
export function assertNoTileErrors(report: TileErrorReport): void {
  if (report.count === 0) {
    return;
  }
  throw new Error(tileErrorMessage(report.terrain));
}

/* ────── Export phases ────── */

export type ExportPhase =
  | "Loading terrain"
  | "Rendering map"
  | "Building file";

export type ExportPhaseReporter = (phase: ExportPhase) => void;

/**
 * Reports "Loading terrain" until the terrain sources of the export map
 * report themselves loaded, then "Rendering map". Real MapLibre events
 * drive the change, so the text never claims a state the map is not in.
 * A poster without relief starts at "Rendering map".
 */
export function reportLoadPhases(
  map: MaplibreMap,
  reliefSourceIds: string[],
  onPhase?: ExportPhaseReporter,
): () => void {
  if (!onPhase) {
    return () => undefined;
  }

  if (reliefSourceIds.length === 0) {
    onPhase("Rendering map");
    return () => undefined;
  }

  onPhase("Loading terrain");
  let terrainDone = false;

  // Every `sourcedata` event asks the map itself whether the terrain
  // sources hold their tiles now. The map answers for the source that
  // the event names and for the others as well, so one source that
  // stays quiet does not hold the phase back.
  const handleSourceData = () => {
    if (terrainDone) {
      return;
    }
    const ready = reliefSourceIds.every((id) => {
      const source = map.getSource(id);
      return !source || map.isSourceLoaded(id);
    });
    if (!ready) {
      return;
    }
    terrainDone = true;
    onPhase("Rendering map");
  };

  map.on("sourcedata", handleSourceData);
  return () => {
    map.off("sourcedata", handleSourceData);
  };
}

/**
 * Creates a fixed, invisible offscreen container for the export map.
 * Caller is responsible for appending to the DOM and removing when done.
 */
export function createOffscreenContainer(
  width: number,
  height: number,
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "-100000px";
  el.style.top = "0";
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.pointerEvents = "none";
  el.style.opacity = "0";
  return el;
}

export interface ExportRenderParams {
  center: maplibregl.LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
  style: StyleSpecification;
  previewWidth: number;
  previewHeight: number;
  renderWidth: number;
  renderHeight: number;
  pixelRatio: number;
  markerProjection: MarkerProjectionInput;
  markerScaleX: number;
  markerScaleY: number;
  markerSizeScale: number;
}

/**
 * Derives all render dimensions and marker projection data needed to create
 * an offscreen export map that matches the live preview framing.
 */
export function resolveExportRenderParams(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
): ExportRenderParams {
  const internalMapContainer = map.getContainer();
  const visibleContainer = internalMapContainer.parentElement;

  // Derive the actual overzoom scale from the DOM so the export matches the
  // live preview even when adaptive overzoom has scaled beyond the static
  // MAP_OVERZOOM_SCALE (e.g. on small mobile viewports).
  const actualOverzoomScale =
    visibleContainer && visibleContainer.clientWidth > 0
      ? internalMapContainer.clientWidth / visibleContainer.clientWidth
      : MAP_OVERZOOM_SCALE;

  const visiblePreviewWidth =
    visibleContainer?.clientWidth ||
    Math.round(internalMapContainer.clientWidth / actualOverzoomScale);
  const visiblePreviewHeight =
    visibleContainer?.clientHeight ||
    Math.round(internalMapContainer.clientHeight / actualOverzoomScale);
  const previewWidth = Math.max(visiblePreviewWidth, 1);
  const previewHeight = Math.max(visiblePreviewHeight, 1);

  const center = map.getCenter();
  const zoom = map.getZoom();
  const pitch = map.getPitch();
  const bearing = map.getBearing();
  const style = map.getStyle() as StyleSpecification;

  const widthScale = Math.max(exportWidth / previewWidth, 1);
  const heightScale = Math.max(exportHeight / previewHeight, 1);
  const basePixelRatio = Math.max(widthScale, heightScale, 1);

  const renderWidth = Math.max(1, Math.round(previewWidth * actualOverzoomScale));
  const renderHeight = Math.max(1, Math.round(previewHeight * actualOverzoomScale));
  const pixelRatio = Math.max(basePixelRatio / actualOverzoomScale, 1);

  const markerProjection: MarkerProjectionInput = {
    centerLat: center.lat,
    centerLon: center.lng,
    zoom,
    bearingDeg: bearing,
    canvasWidth: renderWidth,
    canvasHeight: renderHeight,
  };

  return {
    center,
    zoom,
    pitch,
    bearing,
    style,
    previewWidth,
    previewHeight,
    renderWidth,
    renderHeight,
    pixelRatio,
    markerProjection,
    markerScaleX: exportWidth / renderWidth,
    markerScaleY: exportHeight / renderHeight,
    markerSizeScale: actualOverzoomScale,
  };
}
