import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type {
  MarkerIconDefinition,
  MarkerItem,
} from "@/features/markers/domain/types";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import type { Route } from "@/features/routes/domain/types";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import { applyFades } from "@/features/poster/infrastructure/renderer/layers";
import {
  computeSheetGeometry,
  DEFAULT_SHEET,
  type Sheet,
} from "@/features/poster/domain/sheet";
import { drawPosterText } from "@/features/poster/infrastructure/renderer/typography";
import type { ResolvedTheme } from "@/features/theme/domain/types";
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

interface LayeredSvgOptions {
  map: MaplibreMap;
  exportWidth: number;
  exportHeight: number;
  theme: ResolvedTheme;
  center: { lat: number; lon: number };
  displayCity: string;
  displayCountry: string;
  fontFamily?: string;
  showPosterText: boolean;
  showOverlay: boolean;
  includeCredits: boolean;
  showTerrainCredit?: boolean;
  markers: MarkerItem[];
  markerIcons: MarkerIconDefinition[];
  routes?: Route[];
  sheet?: Sheet;
  onPhase?: ExportPhaseReporter;
  maxCanvasSide?: number;
}

function renderMapCanvasToDataUrl(
  mapCanvas: HTMLCanvasElement,
  exportWidth: number,
  exportHeight: number,
): string {
  const { canvas: layerCanvas, ctx } = createExportCanvas(
    exportWidth,
    exportHeight,
  );
  ctx.clearRect(0, 0, exportWidth, exportHeight);
  ctx.drawImage(mapCanvas, 0, 0, exportWidth, exportHeight);
  return layerCanvas.toDataURL("image/png");
}

function canvasToDataUrl(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): string {
  const { canvas, ctx } = createExportCanvas(width, height);
  ctx.clearRect(0, 0, width, height);
  draw(ctx);
  return canvas.toDataURL("image/png");
}

function sanitizeLayerId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function createLayeredSvgBlobFromMap({
  map,
  exportWidth,
  exportHeight,
  theme,
  center,
  displayCity,
  displayCountry,
  fontFamily,
  showPosterText,
  showOverlay,
  includeCredits,
  showTerrainCredit = false,
  markers,
  markerIcons,
  routes = [],
  sheet = DEFAULT_SHEET,
  onPhase,
  maxCanvasSide = 4096,
}: LayeredSvgOptions): Promise<Blob> {
  await waitForMapIdle(map);

  // The SVG reads the same sheet model as the preview and the PNG.
  const geometry = computeSheetGeometry(exportWidth, exportHeight, sheet);

  const {
    center: mapCenter,
    zoom,
    pitch,
    bearing,
    style,
    renderWidth,
    renderHeight,
    pixelRatio,
    padding,
    markerProjection,
    markerScaleX,
    markerScaleY,
    markerSizeScale,
  } = resolveExportRenderParams(map, exportWidth, exportHeight);

  const reliefSourceIds = reliefSourceIdsInStyle(style);
  const reliefTimeoutMs =
    reliefSourceIds.length > 0 ? RELIEF_EXPORT_TIMEOUT_MS : undefined;
  const offscreenContainer = createOffscreenContainer(renderWidth, renderHeight);
  document.body.appendChild(offscreenContainer);

  const exportMap = new maplibregl.Map({
    container: offscreenContainer,
    style,
    center: [mapCenter.lng, mapCenter.lat],
    zoom,
    pitch,
    bearing,
    interactive: false,
    attributionControl: false,
    pixelRatio,
    maxCanvasSize: [maxCanvasSide, maxCanvasSide],
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  // The MapLibre constructor takes no padding, so the export map gets
  // it here. It is the padding of the preview map, which holds the
  // chosen location at the center of the map hole of the sheet.
  exportMap.setPadding(padding);

  // The SVG export draws one layer at a time. A failed tile would leave
  // a hole in one group, so the same rule applies here as for the PNG.
  const tileErrors = trackTileErrors(exportMap, reliefSourceIds);
  const contextLoss = trackContextLoss(exportMap);
  const stopPhases = reportLoadPhases(exportMap, reliefSourceIds, onPhase);

  try {
    await Promise.race([
      waitForMapIdle(exportMap, reliefTimeoutMs),
      tileErrors.failure,
      contextLoss.failure,
    ]);
    assertNoTileErrors(tileErrors.report());
    onPhase?.("Building file");

    const exportStyle = exportMap.getStyle();
    const layerIds = (exportStyle.layers ?? []).map((layer) => layer.id);
    const originalVisibility = new Map<string, string>();
    const visibleLayerIds = layerIds.filter((layerId) => {
      const visibility = String(
        exportMap.getLayoutProperty(layerId, "visibility") ?? "visible",
      );
      originalVisibility.set(layerId, visibility);
      return visibility !== "none";
    });

    for (const layerId of visibleLayerIds) {
      exportMap.setLayoutProperty(layerId, "visibility", "none");
    }
    await waitForMapIdle(exportMap, reliefTimeoutMs);

    const mapLayerDataUrls: { id: string; dataUrl: string }[] = [];
    for (const layerId of visibleLayerIds) {
      exportMap.setLayoutProperty(layerId, "visibility", "visible");
      await waitForMapIdle(exportMap, reliefTimeoutMs);
      mapLayerDataUrls.push({
        id: layerId,
        dataUrl: renderMapCanvasToDataUrl(
          exportMap.getCanvas(),
          exportWidth,
          exportHeight,
        ),
      });
      exportMap.setLayoutProperty(layerId, "visibility", "none");
      await waitForMapIdle(exportMap, reliefTimeoutMs);
    }

    for (const layerId of layerIds) {
      const visibility = originalVisibility.get(layerId) ?? "visible";
      exportMap.setLayoutProperty(layerId, "visibility", visibility);
    }
    await waitForMapIdle(exportMap, reliefTimeoutMs);

    const overlayLayers: { id: string; dataUrl: string }[] = [];

    // A sheet whose text sits on the mat carries no fade, and an empty
    // group would only add a full size transparent image to the file.
    if (showOverlay && (geometry.fades.top > 0 || geometry.fades.bottom > 0)) {
      overlayLayers.push({
        id: "fades",
        dataUrl: canvasToDataUrl(exportWidth, exportHeight, (ctx) => {
          applyFades(ctx, geometry, theme.ui.bg);
        }),
      });
    }

    if (routes.length > 0) {
      const routesCanvas = document.createElement("canvas");
      routesCanvas.width = exportWidth;
      routesCanvas.height = exportHeight;
      const routesCtx = routesCanvas.getContext("2d");
      if (routesCtx) {
        drawRoutesOnCanvas(
          routesCtx,
          routes,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        );
        overlayLayers.push({
          id: "routes",
          dataUrl: routesCanvas.toDataURL("image/png"),
        });
      }
    }

    if (routes.length > 0 && markerIcons.length > 0) {
      const endpointItems = routeEndpointMarkerItems(routes);
      if (endpointItems.length > 0) {
        const endpointsCanvas = document.createElement("canvas");
        endpointsCanvas.width = exportWidth;
        endpointsCanvas.height = exportHeight;
        const endpointsCtx = endpointsCanvas.getContext("2d");
        if (endpointsCtx) {
          await drawMarkersOnCanvas(
            endpointsCtx,
            endpointItems,
            markerIcons,
            markerProjection,
            markerScaleX,
            markerScaleY,
            markerSizeScale,
          );
          overlayLayers.push({
            id: "route-endpoints",
            dataUrl: endpointsCanvas.toDataURL("image/png"),
          });
        }
      }
    }

    if (markers.length > 0 && markerIcons.length > 0) {
      // drawMarkersOnCanvas is async; render through explicit await canvas path.
      const markersCanvas = document.createElement("canvas");
      markersCanvas.width = exportWidth;
      markersCanvas.height = exportHeight;
      const markersCtx = markersCanvas.getContext("2d");
      if (markersCtx) {
        await drawMarkersOnCanvas(
          markersCtx,
          markers,
          markerIcons,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        );
        overlayLayers.push({
          id: "markers",
          dataUrl: markersCanvas.toDataURL("image/png"),
        });
      }
    }

    // The mat is a shape, not a picture. The SVG carries it as one
    // path, so it stays crisp at any size and an editor can recolor it.
    // It sits below the text and above the map, the fades and the
    // markers, exactly as it does on the canvas.
    const matPath = geometry.hasMat
      ? `<path d="M 0 0 L ${exportWidth} 0 L ${exportWidth} ${exportHeight} L 0 ${exportHeight} Z ${geometry.holePath}" fill="${theme.ui.bg}" fill-rule="evenodd" />`
      : "";

    overlayLayers.push({
      id: "text",
      dataUrl: canvasToDataUrl(exportWidth, exportHeight, (ctx) => {
        drawPosterText(
          ctx,
          exportWidth,
          exportHeight,
          theme,
          { lat: center.lat, lon: center.lon },
          displayCity,
          displayCountry,
          fontFamily,
          showPosterText,
          showOverlay,
          includeCredits,
          showTerrainCredit,
          geometry.text,
        );
      }),
    });

    const mapLayerGroups = mapLayerDataUrls
      .map(
        (layer) => `<g id="map-layer-${sanitizeLayerId(layer.id)}">
  <image href="${layer.dataUrl}" width="${exportWidth}" height="${exportHeight}" preserveAspectRatio="none" />
</g>`,
      )
      .join("\n");

    const overlayGroups = overlayLayers
      .map((layer) => {
        const matBefore =
          layer.id === "text" && matPath
            ? `<g id="overlay-layer-mat">
  ${matPath}
</g>
`
            : "";
        return `${matBefore}<g id="overlay-layer-${sanitizeLayerId(layer.id)}">
  <image href="${layer.dataUrl}" width="${exportWidth}" height="${exportHeight}" preserveAspectRatio="none" />
</g>`;
      })
      .join("\n");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
${mapLayerGroups}
${overlayGroups}
</svg>`;

    return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  } finally {
    stopPhases();
    tileErrors.dispose();
    contextLoss.dispose();
    exportMap.remove();
    offscreenContainer.remove();
  }
}
