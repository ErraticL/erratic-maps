import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { reliefSourceIdsInStyle } from "@/features/map/infrastructure/reliefSource";
import {
  waitForMapIdle,
  createOffscreenContainer,
  resolveExportRenderParams,
  trackTileErrors,
  assertNoTileErrors,
  reportLoadPhases,
  RELIEF_EXPORT_TIMEOUT_MS,
  type ExportPhaseReporter,
} from "./exportUtils";

export interface CapturedMapResult {
  canvas: HTMLCanvasElement;
  markerProjection: MarkerProjectionInput;
  markerScaleX: number;
  markerScaleY: number;
  markerSizeScale: number;
}

/**
 * Captures the currently visible map view at full export resolution.
 * Uses a hidden offscreen map so PNG/PDF output remains sharp.
 */
export async function captureMapAsCanvas(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
  onPhase?: ExportPhaseReporter,
): Promise<CapturedMapResult> {
  await waitForMapIdle(map);

  const {
    center,
    zoom,
    pitch,
    bearing,
    style,
    renderWidth,
    renderHeight,
    pixelRatio,
    markerProjection,
    markerScaleX,
    markerScaleY,
    markerSizeScale,
  } = resolveExportRenderParams(map, exportWidth, exportHeight);

  const reliefSourceIds = reliefSourceIdsInStyle(style);
  const offscreenContainer = createOffscreenContainer(renderWidth, renderHeight);
  document.body.appendChild(offscreenContainer);

  const exportMap = new maplibregl.Map({
    container: offscreenContainer,
    style,
    center: [center.lng, center.lat],
    zoom,
    pitch,
    bearing,
    interactive: false,
    attributionControl: false,
    pixelRatio,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  // A failed tile leaves a hole in the poster, and MapLibre still
  // reports the map as loaded. The export counts the failures and
  // refuses to build a file from an incomplete map.
  const tileErrors = trackTileErrors(exportMap, reliefSourceIds);
  const stopPhases = reportLoadPhases(exportMap, reliefSourceIds, onPhase);

  try {
    await Promise.race([
      waitForMapIdle(
        exportMap,
        reliefSourceIds.length > 0 ? RELIEF_EXPORT_TIMEOUT_MS : undefined,
      ),
      tileErrors.failure,
    ]);
    assertNoTileErrors(tileErrors.report());
    onPhase?.("Building file");

    const glCanvas = exportMap.getCanvas();
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create 2D context for export canvas");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(glCanvas, 0, 0, exportWidth, exportHeight);

    return { canvas: exportCanvas, markerProjection, markerScaleX, markerScaleY, markerSizeScale };
  } finally {
    stopPhases();
    tileErrors.dispose();
    exportMap.remove();
    offscreenContainer.remove();
  }
}
