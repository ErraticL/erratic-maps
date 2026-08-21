import { useState } from "react";
import { createPortal } from "react-dom";
import { usePresets } from "@/features/presets/application/usePresets";
import { PRESET_CARD_BASE } from "@/features/presets/infrastructure/presetRepository";
import type { Preset } from "@/features/presets/domain/types";

/**
 * The Presets section. Each card shows a real export of the preset at
 * one fixed place, so the picture is the poster and not a drawing of
 * it. A click sets the theme, the plate, the sheet and the layers at
 * once; every section below then shows the new values and stays
 * editable.
 */
export default function PresetsSection() {
  const { presets, activePresetId, hasEdits, applyPreset } = usePresets();
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null);

  const handleClick = (preset: Preset) => {
    if (preset.id === activePresetId) return;
    // Decision 19: a preset click discards the current edits, so it
    // asks first, and only while edits exist.
    if (hasEdits) {
      setPendingPreset(preset);
      return;
    }
    applyPreset(preset);
  };

  return (
    <section className="panel-block preset-section">
      <p className="section-summary-label">PRESETS</p>
      <p className="preset-hint">
        A preset sets the theme, the drawing, the composition and the
        layers at once. Every control stays yours afterwards.
      </p>
      <div className="preset-card-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card${
              preset.id === activePresetId ? " preset-card--active" : ""
            }`}
            onClick={() => handleClick(preset)}
            aria-pressed={preset.id === activePresetId}
            title={preset.description}
          >
            <img
              className="preset-card-image"
              src={`${PRESET_CARD_BASE}${preset.card}`}
              alt=""
              loading="lazy"
              width={300}
              height={424}
            />
            <span className="preset-card-name">{preset.name}</span>
          </button>
        ))}
      </div>

      {pendingPreset ? (
        <ApplyPresetModal
          preset={pendingPreset}
          onCancel={() => setPendingPreset(null)}
          onConfirm={() => {
            applyPreset(pendingPreset);
            setPendingPreset(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ApplyPresetModal({
  preset,
  onCancel,
  onConfirm,
}: {
  preset: Preset;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div
      className="picker-modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="picker-modal preset-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="preset-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="preset-confirm-modal__body">
          <p className="preset-confirm-modal__headline" id="preset-confirm-title">
            Apply {preset.name}?
          </p>
          <p className="preset-confirm-modal__text">
            Your changes to the theme, the drawing, the composition and the
            layers go away. The location, the size, the markers and the
            routes stay.
          </p>
          <div className="preset-confirm-modal__actions">
            <button
              type="button"
              className="preset-confirm-modal__cancel"
              onClick={onCancel}
            >
              Keep my poster
            </button>
            <button
              type="button"
              className="preset-confirm-modal__confirm"
              onClick={onConfirm}
            >
              Apply {preset.name}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
