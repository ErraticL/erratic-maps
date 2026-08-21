import { useCallback, useMemo } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { localStorageCache } from "@/core/cache/localStorageCache";
import type { ExportFormat } from "@/features/export/domain/types";
import { captureMapAsCanvas } from "@/features/export/infrastructure/mapExporter";
import { compositeExport } from "@/features/poster/infrastructure/renderer";
import {
  limitsFor,
  sizeForTier,
  useExportResolution,
} from "@/features/export/application/useExportResolution";
import { baseTierFor } from "@/features/export/domain/resolution";
import { getAllMarkerIcons } from "@/features/markers/infrastructure/iconRegistry";
import { ensureFont } from "@/core/services";
import {
  createPngBlob,
  createPdfBlobFromCanvas,
  createLayeredSvgBlobFromMap,
  createPosterFilename,
  triggerDownloadBlob,
} from "@/core/services";
import {
  CM_PER_INCH,
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
} from "@/core/config";
import { trackEvent, setUserProperty } from "@/core/services";

const EXPORT_COUNT_STORAGE_KEY = "erratic-maps.poster.count";

// Use a 1-year TTL so the export count persists across sessions.
const EXPORT_COUNT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Report time-to-first-export once per session (not per export).
let firstExportTimed = false;

// Timestamp of the last export this session, for measuring the gap between
// exports. Stays null until the first export, so the param is omitted then.
let lastExportAt: number | null = null;

/**
 * Fires the analytics for a successful export: the poster_exported event,
 * the once-per-session time-to-first-export, and the lifetime_export_count
 * user property (the current total, not a per-event log entry).
 */
function reportExportSuccess(
  nextCount: number,
  exportParams: Record<string, string | number | boolean>,
): void {
  trackEvent("poster_exported", exportParams);

  if (!firstExportTimed) {
    firstExportTimed = true;
    trackEvent("time_to_first_export", {
      seconds_to_first_export: Math.round(
        (Date.now() - performance.timeOrigin) / 1000,
      ),
    });
  }

  lastExportAt = Date.now();
  setUserProperty("lifetime_export_count", nextCount);
}

function readPosterExportCount(): number {
  const stored = localStorageCache.read<number>(
    EXPORT_COUNT_STORAGE_KEY,
    EXPORT_COUNT_TTL_MS,
  );
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 0) {
    return Math.floor(stored);
  }
  return 0;
}

function writePosterExportCount(nextCount: number): void {
  localStorageCache.write(EXPORT_COUNT_STORAGE_KEY, nextCount);
}

/**
 * Provides handlers for exporting the live poster preview as PNG or PDF.
 *
 * Flow:
 * 1. Resize MapLibre container to full export resolution.
 * 2. Wait for tiles at new resolution.
 * 3. Snapshot the WebGL canvas.
 * 4. Composite fades + text onto the snapshot.
 * 5. Download.
 */
export function useExport() {
  const { state, dispatch, effectiveTheme, mapRef } = usePosterContext();
  const { form } = state;
  // The resolution the visitor chose in the download dialog. The same
  // numbers drive the readout there, so the file always matches it.
  const { input: sizeInput, selected: selectedTier } = useExportResolution();
  const hasVisibleMarkers = form.showMarkers && state.markers.length > 0;
  const visibleRoutes = useMemo(
    () =>
      form.showRoutes
        ? state.routes.filter((route) => route.visible)
        : [],
    [form.showRoutes, state.routes],
  );
  const hasVisibleOverlays = hasVisibleMarkers || visibleRoutes.length > 0;
  // The poster names the terrain source while relief draws on it.
  const showTerrainCredit = Boolean(
    form.reliefContours || form.reliefHillshade,
  );

  const exportPoster = useCallback(
    async (format: ExportFormat) => {
      const map = mapRef.current;
      if (!map) {
        dispatch({ type: "SET_ERROR", error: "Map is not ready." });
        return;
      }

      dispatch({ type: "SET_EXPORT_STATUS", exporting: true });
      // Real MapLibre events drive this text. It reports a phase, not a
      // percentage, and it serves every export, not only relief.
      const reportPhase = (phase: string) =>
        dispatch({ type: "SET_EXPORT_PHASE", phase });
      reportPhase("Rendering map");

      try {
        // Ensure font is loaded before compositing text
        if (form.showPosterText && form.fontFamily.trim()) {
          await ensureFont(form.fontFamily.trim());
        }

        const widthCm = Number(form.width) || DEFAULT_POSTER_WIDTH_CM;
        const heightCm = Number(form.height) || DEFAULT_POSTER_HEIGHT_CM;
        const widthInches = widthCm / CM_PER_INCH;
        const heightInches = heightCm / CM_PER_INCH;

        // The layered SVG export embeds one raster per layer, about
        // twenty five of them, so it keeps the standard resolution.
        const tier =
          format === "svg" ? baseTierFor(sizeInput.kind) : selectedTier;
        const size = sizeForTier(sizeInput, tier);
        const maxCanvasSide = limitsFor(tier).maxSide;

        // Aggregate, non-personal export data. Use only the structured city /
        // country — never raw input (form.location) or coordinates.
        const nextCount = readPosterExportCount() + 1;
        const secondsBetweenExports =
          lastExportAt !== null
            ? Math.round((Date.now() - lastExportAt) / 1000)
            : null;
        const exportParams = {
          format,
          poster_city: form.displayCity.trim() || "unknown",
          poster_country: form.displayCountry.trim() || "unknown",
          theme: form.theme,
          poster_size: `${widthCm}x${heightCm}`,
          resolution: tier.id,
          font: form.fontFamily.trim() || "default",
          has_markers: hasVisibleMarkers,
          has_routes: visibleRoutes.length > 0,
          export_number: nextCount,
          ...(secondsBetweenExports !== null
            ? { seconds_between_exports: secondsBetweenExports }
            : {}),
        };

        const lat = Number(form.latitude) || 0;
        const lon = Number(form.longitude) || 0;

        if (format === "svg") {
          const svgBlob = await createLayeredSvgBlobFromMap({
            map,
            exportWidth: size.width,
            exportHeight: size.height,
            theme: effectiveTheme,
            center: { lat, lon },
            displayCity: form.displayCity || form.location || "",
            displayCountry: form.displayCountry || "",
            fontFamily: form.fontFamily.trim(),
            showPosterText: form.showPosterText,
            showOverlay: form.showMarkers,
            includeCredits: form.includeCredits,
            showTerrainCredit,
            markers: hasVisibleMarkers ? state.markers : [],
            markerIcons: hasVisibleOverlays
              ? getAllMarkerIcons(state.customMarkerIcons)
              : [],
            routes: visibleRoutes,
            onPhase: reportPhase,
            maxCanvasSide,
          });
          const svgFilename = createPosterFilename(
            form.displayCity || form.location,
            form.theme,
            "svg",
          );
          await triggerDownloadBlob(svgBlob, svgFilename);
          reportExportSuccess(nextCount, exportParams);
          writePosterExportCount(nextCount);
          dispatch({ type: "SET_EXPORT_STATUS", exporting: false });
          return;
        }

        // 1. Capture map at full export resolution
        const {
          canvas: mapCanvas,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        } = await captureMapAsCanvas(
          map,
          size.width,
          size.height,
          reportPhase,
          maxCanvasSide,
        );

        // 2. Composite fades + text
        const { canvas } = await compositeExport(mapCanvas, {
          theme: effectiveTheme,
          center: { lat, lon },
          widthInches,
          heightInches,
          displayCity: form.displayCity || form.location || "",
          displayCountry: form.displayCountry || "",
          fontFamily: form.fontFamily.trim(),
          showPosterText: form.showPosterText,
          showOverlay: form.showMarkers,
          includeCredits: form.includeCredits,
          showTerrainCredit,
          markers: hasVisibleMarkers ? state.markers : [],
          markerIcons: hasVisibleOverlays
            ? getAllMarkerIcons(state.customMarkerIcons)
            : [],
          markerProjection: hasVisibleOverlays ? markerProjection : undefined,
          markerScaleX: hasVisibleOverlays ? markerScaleX : undefined,
          markerScaleY: hasVisibleOverlays ? markerScaleY : undefined,
          markerSizeScale: hasVisibleOverlays ? markerSizeScale : undefined,
          routes: visibleRoutes,
        });

        // 3. Download
        const filename = createPosterFilename(
          form.displayCity || form.location,
          form.theme,
          format,
        );

        if (format === "pdf") {
          const pdfBlob = createPdfBlobFromCanvas(canvas, {
            widthCm,
            heightCm,
          });
          await triggerDownloadBlob(pdfBlob, filename);
        } else {
          const pngBlob = await createPngBlob(canvas, size.dpi);
          await triggerDownloadBlob(pngBlob, filename);
        }

        reportExportSuccess(nextCount, exportParams);
        writePosterExportCount(nextCount);
        dispatch({ type: "SET_EXPORT_STATUS", exporting: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed.";
        trackEvent("export_failed", { format, reason: message });
        dispatch({ type: "SET_EXPORT_STATUS", exporting: false, error: message });
      }
    },
    [
      mapRef,
      form,
      effectiveTheme,
      dispatch,
      hasVisibleMarkers,
      hasVisibleOverlays,
      showTerrainCredit,
      visibleRoutes,
      sizeInput,
      selectedTier,
      state.markers,
      state.customMarkerIcons,
    ],
  );

  const handleDownloadPng = useCallback(
    () => exportPoster("png"),
    [exportPoster],
  );

  const handleDownloadPdf = useCallback(
    () => exportPoster("pdf"),
    [exportPoster],
  );

  const handleDownloadSvg = useCallback(
    () => exportPoster("svg"),
    [exportPoster],
  );

  return {
    isExporting: state.isExporting,
    exportPhase: state.exportPhase,
    exportError: state.error,
    exportPoster,
    handleDownloadPng,
    handleDownloadPdf,
    handleDownloadSvg,
  };
}
