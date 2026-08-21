import { useCallback, useMemo } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { writeStoredResolution } from "./resolutionStorage";
import {
  getLayoutOption,
  createCustomLayoutOption,
} from "@/features/layout/infrastructure/layoutRepository";
import {
  resolveCanvasSize,
  STANDARD_LIMITS,
} from "@/features/poster/infrastructure/renderer/canvas";
import { readDeviceCeiling } from "@/features/export/infrastructure/deviceCeiling";
import {
  baseTierFor,
  findTier,
  formatResolutionReadout,
  readSetting,
  tiersFor,
  writeSetting,
  EMPTY_RESOLUTION_SETTING,
  type CanvasLimits,
  type LayoutKind,
  type ResolutionSetting,
  type ResolutionTier,
  type ResolutionTierId,
} from "@/features/export/domain/resolution";
import { matchesLayoutSize } from "@/features/layout/domain/layoutMatcher";
import {
  CM_PER_INCH,
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
  LAYOUT_MATCH_TOLERANCE_CM,
} from "@/core/config";
import type { CanvasSize } from "@/features/poster/domain/types";

/* ────── The poster the export renders ────── */

export interface ExportSizeInput {
  kind: LayoutKind;
  layoutName: string;
  widthInches: number;
  heightInches: number;
  pixelWidth: number;
  pixelHeight: number;
}

/** The limits every tier above Standard takes: the WebGL limit. */
export function deviceLimits(): CanvasLimits {
  const { maxSide } = readDeviceCeiling();
  return { maxSide, maxPixels: maxSide * maxSide };
}

export function limitsFor(tier: ResolutionTier): CanvasLimits {
  return tier.standard ? STANDARD_LIMITS : deviceLimits();
}

export function sizeForTier(
  input: ExportSizeInput,
  tier: ResolutionTier,
): CanvasSize {
  return resolveCanvasSize({
    widthInches: input.widthInches,
    heightInches: input.heightInches,
    pixelWidth: input.pixelWidth,
    pixelHeight: input.pixelHeight,
    tier,
    limits: limitsFor(tier),
  });
}

/**
 * Reads the poster size the export renders. A print layout states
 * centimeters, and the form carries them. A pixel layout states a
 * pixel size, and the layout carries it.
 */
export function readExportSizeInput(form: {
  layout: string;
  width: string;
  height: string;
}): ExportSizeInput {
  const widthCm = Number(form.width) || DEFAULT_POSTER_WIDTH_CM;
  const heightCm = Number(form.height) || DEFAULT_POSTER_HEIGHT_CM;
  const layout =
    getLayoutOption(form.layout) ?? createCustomLayoutOption(widthCm, heightCm);

  // The named pixel size holds only while the poster still has the
  // size of that layout. A size the visitor typed but has not left yet
  // reaches this function before the layout changes to Custom, and the
  // named pixels would then export another shape than the preview.
  const keepsLayoutSize = matchesLayoutSize(
    layout,
    widthCm,
    heightCm,
    LAYOUT_MATCH_TOLERANCE_CM,
  );
  const isPixelLayout = layout.unit === "px" && keepsLayoutSize;

  return {
    kind: isPixelLayout ? "pixel" : "print",
    layoutName:
      layout.id === "custom" || !keepsLayoutSize ? "Custom" : layout.name,
    widthInches: widthCm / CM_PER_INCH,
    heightInches: heightCm / CM_PER_INCH,
    pixelWidth: isPixelLayout ? layout.width : 0,
    pixelHeight: isPixelLayout ? layout.height : 0,
  };
}

export interface TierOption {
  tier: ResolutionTier;
  size: CanvasSize;
  /** True while the WebGL limit of the device holds the whole tier. */
  available: boolean;
  /** True while the memory budget of the device holds the tier. */
  withinBudget: boolean;
}

export function buildTierOptions(input: ExportSizeInput): TierOption[] {
  const { budgetPixels } = readDeviceCeiling();

  return tiersFor(input.kind).map((tier) => {
    const size = sizeForTier(input, tier);
    // A tier the device cannot draw is not on offer. A tier above the
    // memory budget stays on offer and carries a warning, because the
    // budget is an estimate and the WebGL limit is a fact.
    const available = tier.standard || size.downscaleFactor === 1;
    const withinBudget = size.width * size.height <= budgetPixels;
    return { tier, size, available, withinBudget };
  });
}

/**
 * The tier the export takes while the visitor has chosen nothing:
 * 300 DPI where the budget of the device allows it, Standard elsewhere.
 * A pixel layout always takes its named size.
 */
export function defaultTier(
  input: ExportSizeInput,
  options: TierOption[],
): ResolutionTier {
  const base = baseTierFor(input.kind);
  if (input.kind === "pixel") {
    return base;
  }
  const best = options.find(
    (option) =>
      option.tier.id === "dpi300" && option.available && option.withinBudget,
  );
  return best ? best.tier : base;
}

/**
 * Everything the download dialog and the Layout section need: the
 * options, the tier the export takes and the one line that reports it.
 */
export function useExportResolution() {
  const { state, dispatch } = usePosterContext();
  const { form, exportResolution } = state;

  const input = useMemo(
    () =>
      readExportSizeInput({
        layout: form.layout,
        width: form.width,
        height: form.height,
      }),
    [form.layout, form.width, form.height],
  );

  const options = useMemo(() => buildTierOptions(input), [input]);

  const selected = useMemo(() => {
    const fallback = defaultTier(input, options);
    const chosenId = readSetting(exportResolution, input.kind);
    if (!chosenId) {
      return fallback;
    }
    const chosen = options.find(
      (option) => option.tier.id === chosenId && option.available,
    );
    // A chosen tier that this poster cannot reach falls back to the
    // default without changing the stored choice.
    return chosen ? chosen.tier : fallback;
  }, [exportResolution, input, options]);

  const size = useMemo(
    () => options.find((option) => option.tier.id === selected.id)?.size ??
      sizeForTier(input, selected),
    [input, options, selected],
  );

  const readout = useMemo(
    () => formatResolutionReadout(input.layoutName, size.width, size.height),
    [input.layoutName, size.height, size.width],
  );

  const selectTier = useCallback(
    (tierId: ResolutionTierId) => {
      if (!findTier(input.kind, tierId)) {
        return;
      }
      const next = writeSetting(
        exportResolution ?? EMPTY_RESOLUTION_SETTING,
        input.kind,
        tierId,
      );
      dispatch({ type: "SET_EXPORT_RESOLUTION", setting: next });
      writeStoredResolution(next);
    },
    [dispatch, exportResolution, input.kind],
  );

  return { input, options, selected, size, readout, selectTier };
}
