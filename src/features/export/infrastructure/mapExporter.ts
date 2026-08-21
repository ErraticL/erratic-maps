import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { reliefSourceIdsInStyle } from "@/features/map/infrastructure/reliefSource";
import {
  waitForMapIdle,
  createExportCanvas,
  createOffscreenContainer,
  resolveExportRenderParams,
  trackContextLoss,
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
 *
 * `maxCanvasSide` raises the MapLibre limit of the GL canvas to what
 * the chosen resolution needs. Without it MapLibre lowers the pixel
 * ratio until the canvas fits its default of 4096, and the 2D canvas
 * then scales a small render up to the export size.
 */
export async function captureMapAsCanvas(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
  onPhase?: ExportPhaseReporter,
  maxCanvasSide: number = 4096,
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
    maxCanvasSize: [maxCanvasSide, maxCanvasSide],
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  // A failed tile leaves a hole in the poster, and MapLibre still
  // reports the map as loaded. The export counts the failures and
  // refuses to build a file from an incomplete map.
  const tileErrors = trackTileErrors(exportMap, reliefSourceIds);
  const contextLoss = trackContextLoss(exportMap);
  const stopPhases = reportLoadPhases(exportMap, reliefSourceIds, onPhase);

  try {
    await Promise.race([
      waitForMapIdle(
        exportMap,
        reliefSourceIds.length > 0 ? RELIEF_EXPORT_TIMEOUT_MS : undefined,
      ),
      tileErrors.failure,
      contextLoss.failure,
    ]);
    assertNoTileErrors(tileErrors.report());
    onPhase?.("Building file");

    const glCanvas = exportMap.getCanvas();
    const { canvas: exportCanvas, ctx } = createExportCanvas(
      exportWidth,
      exportHeight,
    );

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(glCanvas, 0, 0, exportWidth, exportHeight);

    return { canvas: exportCanvas, markerProjection, markerScaleX, markerScaleY, markerSizeScale };
  } finally {
    stopPhases();
    tileErrors.dispose();
    contextLoss.dispose();
    exportMap.remove();
    offscreenContainer.remove();
  }
}
