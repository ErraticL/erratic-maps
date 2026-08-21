import { useEffect, useState } from "react";
import { useExport } from "@/features/export/application/useExport";
import { useExportResolution } from "@/features/export/application/useExportResolution";
import {
  ABOVE_BUDGET_WARNING,
  SVG_STANDARD_NOTE,
} from "@/features/export/domain/resolution";
import type { ExportFormat } from "@/features/export/domain/types";
import { CloseIcon, DownloadIcon, LoaderIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";

const FORMAT_OPTIONS: { format: ExportFormat; label: string }[] = [
  { format: "png", label: "PNG" },
  { format: "pdf", label: "PDF" },
  { format: "svg", label: "RSVG" },
];

interface ExportFabProps {
  isMobile: boolean;
}

export default function ExportFab({ isMobile }: ExportFabProps) {
  const { isExporting, exportPhase, exportError, exportPoster } = useExport();
  const {
    options: resolutionOptions,
    selected: selectedResolution,
    readout: resolutionReadout,
    selectTier,
  } = useExportResolution();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [isTriggerVisible, setIsTriggerVisible] = useState(true);
  const [failure, setFailure] = useState("");

  // A finished export closes the dialog. A failed one keeps it open and
  // shows why, because the settings panel that holds the error line is
  // not on screen while the dialog is.
  useEffect(() => {
    if (!isExporting && activeFormat) {
      setActiveFormat(null);
      if (exportError) {
        setFailure(exportError);
      } else {
        setIsOpen(false);
      }
    }
  }, [isExporting, activeFormat, exportError]);

  useEffect(() => {
    if (!isMobile) return;

    const FOOTER_OVERLAP_THRESHOLD_PX = 140;

    const updateVisibility = () => {
      const doc = document.documentElement;
      const scrolledToBottom =
        window.scrollY + window.innerHeight >=
        doc.scrollHeight - FOOTER_OVERLAP_THRESHOLD_PX;
      setIsTriggerVisible(!scrolledToBottom);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [isMobile]);

  const runExport = (format: ExportFormat) => {
    setFailure("");
    setActiveFormat(format);
    void exportPoster(format);
  };

  // The device holds every offered option, but the memory budget of a
  // device is an estimate. An option above it stays on offer and says
  // so, here and on the option itself.
  const selectedIsRisky = resolutionOptions.some(
    (option) => option.tier.id === selectedResolution.id && !option.withinBudget,
  );

  const triggerClass = isMobile
    ? `mobile-export-fab-trigger${isTriggerVisible ? "" : " is-hidden"}`
    : "export-fab-trigger-desktop";

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        aria-label="Export poster"
        title="Export poster"
        onClick={() => setIsOpen(true)}
        tabIndex={isMobile && !isTriggerVisible ? -1 : 0}
        aria-hidden={isMobile && !isTriggerVisible}
      >
        <DownloadIcon />
        {!isMobile && <span>Download</span>}
      </button>

      {isOpen ? (
        <div
          className="export-modal-backdrop"
          role="presentation"
          onClick={() => !isExporting && setIsOpen(false)}
        >
          <div
            className="export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="export-modal-header">
              <h3 id="export-modal-title">Download Poster</h3>
              <button
                type="button"
                className="export-modal-close"
                onClick={() => !isExporting && setIsOpen(false)}
                aria-label="Close export options"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="export-resolution">
              <p className="export-resolution-label" id="export-resolution-label">
                Resolution
              </p>
              <div
                className="export-resolution-row"
                role="group"
                aria-labelledby="export-resolution-label"
              >
                {resolutionOptions
                  .filter((option) => option.available)
                  .map(({ tier, withinBudget }) => {
                    const isActive = tier.id === selectedResolution.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        className={`export-resolution-option${
                          isActive ? " export-resolution-option--active" : ""
                        }${withinBudget ? "" : " export-resolution-option--risky"}`}
                        aria-pressed={isActive}
                        aria-label={
                          withinBudget
                            ? undefined
                            : `${tier.label}, ${ABOVE_BUDGET_WARNING}`
                        }
                        title={withinBudget ? undefined : ABOVE_BUDGET_WARNING}
                        onClick={() => selectTier(tier.id)}
                        disabled={isExporting}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
              </div>
              <p className="export-resolution-readout">{resolutionReadout}</p>
              {selectedIsRisky ? (
                <p className="export-resolution-warning">
                  This resolution {ABOVE_BUDGET_WARNING}.
                </p>
              ) : null}
              {!selectedResolution.standard ? (
                <p className="export-resolution-note">{SVG_STANDARD_NOTE}</p>
              ) : null}
            </div>

            <div className="export-modal-actions">
              {FORMAT_OPTIONS.map(({ format, label }) => (
                <button
                  key={format}
                  type="button"
                  className={`export-modal-option export-modal-option--${format}`}
                  onClick={() => runExport(format)}
                  disabled={isExporting}
                >
                  {isExporting && activeFormat === format ? (
                    <LoaderIcon className="export-modal-option-icon is-spinning" />
                  ) : (
                    <DownloadIcon className="export-modal-option-icon" />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {isExporting && exportPhase ? (
              <p className="export-modal-phase" role="status" aria-live="polite">
                {exportPhase}&hellip;
              </p>
            ) : null}
            {!isExporting && failure ? (
              <p className="export-modal-error" role="alert">
                {failure}
              </p>
            ) : null}
            <p className="export-modal-support-label">
              Support the project <span className="heart">❤︎</span>
            </p>
            <SocialLinkGroup variant="mobile-export" />
          </div>
        </div>
      ) : null}
    </>
  );
}
