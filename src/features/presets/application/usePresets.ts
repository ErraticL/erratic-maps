import { useCallback, useMemo } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { presets } from "@/features/presets/infrastructure/presetRepository";
import type { Preset } from "../domain/types";
import { matchPresetId } from "../domain/types";
import { presetFormFields, presetValuesFromForm } from "./presetForm";

/**
 * The Presets section reads this hook. It answers three questions:
 * which presets exist, which one the poster shows right now, and how
 * to apply one.
 *
 * The active preset is a comparison, not a stored id. The poster shows
 * a preset while all four dimensions equal that preset. As soon as the
 * visitor moves one control, no card is active any more, and that is
 * exactly the state in which decision 19 asks for a confirmation.
 */
export function usePresets() {
  const { state, dispatch } = usePosterContext();

  const activePresetId = useMemo(
    () =>
      matchPresetId(
        presets,
        presetValuesFromForm(state.form, state.customColors),
      ),
    [state.form, state.customColors],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      dispatch({
        type: "APPLY_PRESET",
        fields: presetFormFields(preset),
        customColors: preset.colors,
      });
    },
    [dispatch],
  );

  return {
    presets,
    activePresetId,
    /** True while the poster differs from every preset. */
    hasEdits: activePresetId === null,
    applyPreset,
  };
}
