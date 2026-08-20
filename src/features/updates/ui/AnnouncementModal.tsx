import { useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { IoClose } from "react-icons/io5";
import { APP_VERSION, UPDATES_URL } from "@/core/config";
import {
  CommunityIcon,
  CoreIcon,
  DocsIcon,
  FixedIcon,
  ImprovedIcon,
  InfoIcon,
  MajorIcon,
  NewIcon,
  PerformanceIcon,
  RemovedIcon,
  RoadmapIcon,
  SecurityIcon,
  WarningIcon,
} from "@/shared/ui/Icons";

type UpdateCategory =
  | "new"
  | "fixed"
  | "improved"
  | "info"
  | "community"
  | "docs"
  | "roadmap"
  | "removed"
  | "security"
  | "breaking"
  | "major"
  | "perf"
  | "core";

interface UpdatePoint {
  type: UpdateCategory;
  text: string;
}

interface UpdateStep {
  title: string;
  image: string | null;
  points: UpdatePoint[];
}

interface UpdateSummary {
  title?: string;
  points: UpdatePoint[];
}

interface UpdateLabels {
  summaryTitle?: string;
  detailsTitle?: string;
}

interface UpdateVersion {
  version: string;
  date: string;
  labels?: UpdateLabels;
  summary?: UpdateSummary;
  steps: UpdateStep[];
}

// The icon is a component. The render site draws it as a vector glyph.
interface CategoryMeta {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

const LAST_SEEN_VERSION = "last_seen_version";
const CURRENT_VERSION = APP_VERSION;

const categoryConfig: Record<UpdateCategory, CategoryMeta> = {
  new: { icon: NewIcon, label: "New" },
  fixed: { icon: FixedIcon, label: "Fixed" },
  improved: { icon: ImprovedIcon, label: "Improved" },
  info: { icon: InfoIcon, label: "Info" },
  community: { icon: CommunityIcon, label: "Community" },
  docs: { icon: DocsIcon, label: "Docs" },
  roadmap: { icon: RoadmapIcon, label: "Roadmap" },
  removed: { icon: RemovedIcon, label: "Removed" },
  security: { icon: SecurityIcon, label: "Security" },
  breaking: { icon: WarningIcon, label: "Breaking" },
  major: { icon: MajorIcon, label: "Major" },
  perf: { icon: PerformanceIcon, label: "Performance" },
  core: { icon: CoreIcon, label: "Core" },
};

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }

  return 0;
}

function toDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).format(date);
}

function resolveImagePath(image: string | null, updatesUrl: string): string | null {
  if (!image) {
    return null;
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  try {
    const updatesBase = new URL(updatesUrl, window.location.origin);
    return new URL(image, updatesBase).toString();
  } catch {
    return image;
  }
}

function renderPointText(text: string) {
  const separatorIndex = text.indexOf(":");
  if (separatorIndex <= 0) {
    return <span>{text}</span>;
  }

  const what = text.slice(0, separatorIndex).trim();
  const why = text.slice(separatorIndex + 1).trim();

  return (
    <span>
      <strong>{what}:</strong> {why}
    </span>
  );
}

export default function AnnouncementModal() {
  const [viewMode, setViewMode] = useState<"summary" | "details">("summary");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [release, setRelease] = useState<UpdateVersion | null>(null);

  useEffect(() => {
    if (!CURRENT_VERSION || !UPDATES_URL) {
      return;
    }

    const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION) ?? "0.0.0";
    const isNewer = compareVersions(CURRENT_VERSION, lastSeenVersion) > 0;

    if (!isNewer) {
      return;
    }

    const controller = new AbortController();

    async function loadUpdates() {
      try {
        setLoading(true);
        const response = await fetch(UPDATES_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          return;
        }

        const targetRelease = (data as UpdateVersion[]).find(
          (item) => item.version === CURRENT_VERSION,
        );
        if (!targetRelease || !Array.isArray(targetRelease.steps)) {
          return;
        }

        setRelease(targetRelease);
        setViewMode("summary");
        setCurrentStep(0);
        setOpen(true);
      } catch {
        // Silent fail: modal remains hidden if updates URL is unavailable.
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadUpdates();

    return () => {
      controller.abort();
    };
  }, []);

  const totalSteps = release?.steps.length ?? 0;
  const isDetailsMode = viewMode === "details";
  const isLastStep = totalSteps > 0 && currentStep === totalSteps - 1;
  const progressPercent = isDetailsMode
    ? totalSteps > 0
      ? Math.round(((currentStep + 1) / totalSteps) * 100)
      : 0
    : 0;
  const activeStep = useMemo(
    () => (release?.steps ? release.steps[currentStep] : null),
    [release, currentStep],
  );
  const summaryPoints = useMemo(() => {
    if (!release) {
      return [];
    }
    if (Array.isArray(release.summary?.points) && release.summary.points.length > 0) {
      return release.summary.points;
    }

    return release.steps
      .flatMap((step) => step.points)
      .slice(0, 4);
  }, [release]);
  const summaryTitle = release?.summary?.title?.trim() || "Quick Highlights";
  const summaryHeaderTitle = release?.labels?.summaryTitle?.trim() || "What is new";
  const detailsHeaderTitle =
    release?.labels?.detailsTitle?.trim() || "Update Details";

  function closeModal() {
    if (CURRENT_VERSION) {
      localStorage.setItem(LAST_SEEN_VERSION, CURRENT_VERSION);
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleNext() {
    if (!release) {
      return;
    }

    if (isLastStep) {
      closeModal();
      return;
    }

    setCurrentStep((value) => Math.min(value + 1, release.steps.length - 1));
  }

  function handleBack() {
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  if (
    !open ||
    !release ||
    (isDetailsMode && !activeStep) ||
    (viewMode === "summary" && summaryPoints.length === 0) ||
    loading
  ) {
    return null;
  }

  const resolvedImagePath =
    isDetailsMode && activeStep
      ? resolveImagePath(activeStep.image, UPDATES_URL)
      : null;

  return (
    <div className="updates-modal-backdrop" role="presentation" onClick={closeModal}>
      <section
        className="updates-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="updates-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {isDetailsMode ? (
          <div className="updates-modal-progress">
            <div
              className="updates-modal-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}

        <button
          type="button"
          className="updates-modal-close"
          onClick={closeModal}
          aria-label="Close announcements"
        >
          <IoClose className="updates-modal-close-icon" />
        </button>

        <header className="updates-modal-header">
          <span className="updates-version-badge">Version {release.version}</span>
          <h2 id="updates-modal-title">
            {isDetailsMode ? detailsHeaderTitle : summaryHeaderTitle}
          </h2>
          <p className="updates-released-on">
            Released on {toDisplayDate(release.date)}
          </p>
        </header>

        <div className="updates-modal-content">
          <h3>{isDetailsMode ? activeStep?.title : summaryTitle}</h3>
          <ul className="updates-points">
            {(isDetailsMode && activeStep ? activeStep.points : summaryPoints).map(
              (point, index) => {
              const category = categoryConfig[point.type] ?? categoryConfig.improved;
              const CategoryIcon = category.icon;

              return (
                <li
                  key={`${point.type}-${index}`}
                  className={`updates-point updates-point--${point.type}`}
                >
                  <span className="updates-point-icon" aria-hidden="true">
                    <CategoryIcon />
                  </span>
                  <div className="updates-point-text">
                    <span className="updates-point-label">{category.label}</span>
                    {renderPointText(point.text)}
                  </div>
                </li>
              );
            },
            )}
          </ul>
          {isDetailsMode && resolvedImagePath ? (
            <img
              className="updates-step-image"
              src={resolvedImagePath}
              alt={`${activeStep.title} preview`}
            />
          ) : null}
        </div>

        <footer className="updates-modal-footer">
          <div className="updates-footer-row">
            <div className="updates-actions">
              {isDetailsMode ? (
                <>
                  <button type="button" onClick={handleBack} disabled={currentStep === 0}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="updates-next-button"
                    onClick={handleNext}
                  >
                    {isLastStep ? "Finish" : "Next"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="updates-next-button"
                    onClick={() => setViewMode("details")}
                  >
                    Show all details
                  </button>
                  <button type="button" className="updates-okay-button" onClick={closeModal}>
                    Okay, got it
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

