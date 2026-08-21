import { applyFades, applyMat } from "./layers";
import { drawPosterText } from "./typography";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import { MEMORY_LIMIT_MESSAGE } from "@/features/export/domain/resolution";
import {
  computeSheetGeometry,
  DEFAULT_SHEET,
} from "@/features/poster/domain/sheet";
import type { ExportOptions, CanvasSize } from "../../domain/types";

/**
 * Composites a final poster from a MapLibre snapshot canvas.
 *
 * 1. Draws the captured map image.
 * 2. Applies the gradient fades that the sheet asks for.
 * 3. Paints the mat of the sheet over the map.
 * 4. Draws poster text (city, country, coords, attribution).
 *
 * Returns the composited canvas + its size metadata.
 */
export async function compositeExport(
  mapCanvas: HTMLCanvasElement,
  options: ExportOptions,
): Promise<{ canvas: HTMLCanvasElement; size: CanvasSize }> {
  const {
    theme,
    center,
    widthInches: _wi,
    heightInches: _hi,
    displayCity,
    displayCountry,
    fontFamily,
    showOverlay = true,
    includeCredits = true,
    showTerrainCredit = false,
    markers = [],
    markerIcons = [],
    markerProjection,
    markerScaleX = 1,
    markerScaleY = 1,
    markerSizeScale = 1,
    routes = [],
    sheet = DEFAULT_SHEET,
  } = options;

  const width = mapCanvas.width;
  const height = mapCanvas.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  // The compositor holds a second canvas of the full export size. A
  // browser that cannot allocate it keeps the old size or hands out no
  // context, and the visitor needs a lower resolution either way.
  if (!ctx || canvas.width !== width || canvas.height !== height) {
    throw new Error(MEMORY_LIMIT_MESSAGE);
  }

  // The sheet decides the map hole, the mat, the fades and the box of
  // the text block. The DOM preview reads the same model at the size of
  // the poster frame, so the file repeats what the visitor saw.
  const geometry = computeSheetGeometry(width, height, sheet);

  // 1. Draw map snapshot
  ctx.drawImage(mapCanvas, 0, 0);

  // 2. Gradient fades
  if (showOverlay) {
    applyFades(ctx, geometry, theme.ui.bg);
  }

  // 3. Routes (below markers)
  if (routes.length > 0 && markerProjection) {
    drawRoutesOnCanvas(
      ctx,
      routes,
      markerProjection,
      markerScaleX,
      markerScaleY,
      markerSizeScale,
    );
  }

  // 4. Route endpoint markers (between route lines and user markers)
  if (routes.length > 0 && markerIcons.length > 0 && markerProjection) {
    const endpointItems = routeEndpointMarkerItems(routes);
    if (endpointItems.length > 0) {
      await drawMarkersOnCanvas(
        ctx,
        endpointItems,
        markerIcons,
        markerProjection,
        markerScaleX,
        markerScaleY,
        markerSizeScale,
      );
    }
  }

  // 5. User markers
  if (markers.length > 0 && markerIcons.length > 0 && markerProjection) {
    await drawMarkersOnCanvas(
      ctx,
      markers,
      markerIcons,
      markerProjection,
      markerScaleX,
      markerScaleY,
      markerSizeScale,
    );
  }

  // 6. The mat covers everything outside the map hole, markers
  // included: a marker belongs to the map, and the map ends at the
  // hole.
  applyMat(ctx, geometry, theme.ui.bg);

  // 7. Poster text
  drawPosterText(
    ctx,
    width,
    height,
    theme,
    center,
    displayCity,
    displayCountry,
    fontFamily,
    showOverlay,
    includeCredits,
    showTerrainCredit,
    geometry.text,
  );

  const size: CanvasSize = {
    width,
    height,
    requestedWidth: width,
    requestedHeight: height,
    downscaleFactor: 1,
    dpi: _wi > 0 ? width / _wi : 0,
  };

  return { canvas, size };
}

export { resolveCanvasSize, STANDARD_LIMITS } from "./canvas";
export { applyFades, applyMat } from "./layers";
export { drawPosterText } from "./typography";
