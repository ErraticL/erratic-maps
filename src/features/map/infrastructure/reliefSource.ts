import maplibregl from "maplibre-gl";
import mlcontour from "maplibre-contour";
import {
  contourThresholds,
  type Relief,
} from "@/features/map/domain/relief";

/**
 * The terrain data source.
 *
 * The tiles are Tilezen terrarium tiles from the AWS Open Data bucket.
 * The visitor's browser fetches them, so Amazon receives the visitor's
 * IP address and the tile coordinates. The privacy policy names Amazon
 * for this reason. The bucket carries no service level agreement.
 *
 * `maplibre-contour` turns the elevation tiles into contour vector
 * tiles inside a web worker, and serves them through a MapLibre
 * protocol. The hillshade is a native MapLibre layer on the same
 * elevation tiles.
 */
export const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** The highest zoom the terrarium tile set holds. */
export const TERRAIN_MAX_ZOOM = 15;

const TERRAIN_TILE_SIZE = 256;
const DEM_CACHE_SIZE = 100;
const DEM_TIMEOUT_MS = 10_000;

export const RELIEF_DEM_SOURCE_ID = "relief-dem";
export const RELIEF_CONTOUR_SOURCE_ID = "relief-contours";
export const RELIEF_HILLSHADE_LAYER_ID = "relief-hillshade";
export const RELIEF_CONTOUR_LAYER_ID = "relief-contour";
export const RELIEF_CONTOUR_MAJOR_LAYER_ID = "relief-contour-major";

/** The vector tile layer that `maplibre-contour` writes the lines into. */
export const CONTOUR_VECTOR_LAYER = "contours";
export const CONTOUR_ELEVATION_KEY = "ele";
export const CONTOUR_LEVEL_KEY = "level";

export const RELIEF_SOURCE_IDS = [
  RELIEF_DEM_SOURCE_ID,
  RELIEF_CONTOUR_SOURCE_ID,
];

type DemSourceInstance = InstanceType<typeof mlcontour.DemSource>;

let demSource: DemSourceInstance | null = null;

/**
 * Returns the shared DEM source, and creates it on the first call.
 *
 * The creation starts a web worker, so it stays lazy: a visitor who
 * never turns relief on never starts the worker and never requests a
 * terrain tile. `setupMaplibre` registers the two protocols on the
 * MapLibre global, so every map of the app reaches them, the offscreen
 * export map included.
 */
export function getDemSource(): DemSourceInstance {
  if (!demSource) {
    demSource = new mlcontour.DemSource({
      url: TERRAIN_TILE_URL,
      encoding: "terrarium",
      maxzoom: TERRAIN_MAX_ZOOM,
      cacheSize: DEM_CACHE_SIZE,
      timeoutMs: DEM_TIMEOUT_MS,
      worker: true,
    });
    demSource.setupMaplibre(maplibregl);
  }
  return demSource;
}

/**
 * Lists the terrain sources that a style holds. The export reads it to
 * know whether it must report a terrain phase, and how long it may
 * wait for the tiles.
 */
export function reliefSourceIdsInStyle(style: {
  sources?: Record<string, unknown>;
}): string[] {
  const sources = style?.sources ?? {};
  return RELIEF_SOURCE_IDS.filter((id) => id in sources);
}

/**
 * Builds the sources that the relief layers read. A source appears
 * only when a layer needs it, so the map requests no terrain tile
 * while the switch is off.
 */
export function buildReliefSources(relief: Relief): Record<string, unknown> {
  const sources: Record<string, unknown> = {};
  if (!relief.hillshade && !relief.contours) {
    return sources;
  }

  const source = getDemSource();

  if (relief.hillshade) {
    sources[RELIEF_DEM_SOURCE_ID] = {
      type: "raster-dem",
      encoding: "terrarium",
      tiles: [source.sharedDemProtocolUrl],
      maxzoom: TERRAIN_MAX_ZOOM,
      tileSize: TERRAIN_TILE_SIZE,
    };
  }

  if (relief.contours) {
    sources[RELIEF_CONTOUR_SOURCE_ID] = {
      type: "vector",
      tiles: [
        source.contourProtocolUrl({
          thresholds: contourThresholds(relief.contourInterval),
          elevationKey: CONTOUR_ELEVATION_KEY,
          levelKey: CONTOUR_LEVEL_KEY,
          contourLayer: CONTOUR_VECTOR_LAYER,
          // One zoom step of over-zoom asks for fewer neighbor tiles.
          overzoom: 1,
        }),
      ],
      maxzoom: TERRAIN_MAX_ZOOM,
    };
  }

  return sources;
}
