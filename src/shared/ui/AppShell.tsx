import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import {
  MAX_MARKER_SIZE,
  MIN_MARKER_SIZE,
} from "@/features/markers/domain/constants";
import GeneralHeader from "@/shared/ui/GeneralHeader";
import DesktopNavBar from "@/shared/ui/DesktopNavBar";
import FooterNote from "@/shared/ui/FooterNote";
import PreviewPanel from "@/features/poster/ui/PreviewPanel";
import MobileNavBar, { type MobileTab } from "@/shared/ui/MobileNavBar";
import InstallPrompt from "@/features/install/ui/InstallPrompt";
import { useSwipeDown } from "@/shared/hooks/useSwipeDown";
import { useAdhesionOffset } from "@/shared/hooks/useAdhesionOffset";
import StartupLocationModal from "@/features/location/ui/StartupLocationModal";
import { CheckIcon } from "@/shared/ui/Icons";
import { useSessionAnalytics } from "@/features/export/application/useSessionAnalytics";
import {
  LEGAL_DOC_EVENT,
  type LegalDocDetail,
  type LegalDocType,
} from "@/features/legal/application/legalDoc";

const AboutModal = lazy(() => import("@/shared/ui/AboutModal"));
const LegalModal = lazy(() => import("@/features/legal/ui/LegalModal"));
const SettingsPanel = lazy(() => import("@/features/poster/ui/SettingsPanel"));
const AnnouncementModal = lazy(
  () => import("@/features/updates/ui/AnnouncementModal"),
);
const ExportFab = lazy(() => import("@/features/export/ui/ExportFab"));
const DesktopLocationBar = lazy(() => import("@/shared/ui/DesktopLocationBar"));

/** The exit transition of the sheet, in milliseconds. It matches mobile.css. */
const DRAWER_EXIT_MS = 200;

/**
 * The viewport test for the mobile layout. It matches the media query at the
 * top of mobile.css exactly. Keep the two the same. A difference would render
 * one panel while the stylesheet shows the other.
 */
const MOBILE_VIEWPORT_QUERY =
  "(max-width: 768px), (hover: none) and (pointer: coarse)";

/** Reports whether the mobile layout applies now. */
function matchesMobileViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

/** Returns true when the user asks the system for less motion. */
function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SettingsDrawer({
  mobileTab,
  open,
  onClose,
  onExited,
}: {
  mobileTab: MobileTab;
  /** The drawer must be visible. A false value starts the exit. */
  open: boolean;
  /** The drawer asks the shell to close it. */
  onClose: () => void;
  /** The exit is complete. The shell removes the drawer from the DOM. */
  onExited: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  // "closed" is the position before the entry. "closing" runs the exit.
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const collapsedHeight = useRef(0);
  const expandOffset = useRef(0);

  const { sheetRef, handleRef, handleProps } = useSwipeDown(onClose, 80, {
    onExpand: (offsetY) => {
      expandOffset.current = offsetY;
      setIsExpanded(true);
    },
  });

  // Drive the entry and the exit. The reflow makes the browser accept the
  // present position first, so the new state attribute starts a transition.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (!open) {
      setPhase("closing");
      return;
    }
    if (collapsedHeight.current === 0) {
      collapsedHeight.current = sheet.offsetHeight;
    }
    void sheet.offsetHeight;
    setPhase("open");
  }, [open, sheetRef]);

  // The sheet grows when it expands. Animate the growth with a transform, so
  // the browser does not lay out the panel on every frame.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!isExpanded || !sheet) return;

    const offset = expandOffset.current;
    expandOffset.current = 0;
    const growth = sheet.offsetHeight - collapsedHeight.current;
    const from = growth + offset;
    if (prefersReducedMotion() || from === 0) return;

    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${from}px)`;
    void sheet.offsetHeight;
    sheet.style.transition = "";
    sheet.style.transform = "";
  }, [isExpanded, sheetRef]);

  // Keep the sheet in the DOM until the exit ends.
  useEffect(() => {
    if (phase !== "closing") return;
    const sheet = sheetRef.current;

    const timer = window.setTimeout(onExited, DRAWER_EXIT_MS + 60);
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== sheet || event.propertyName !== "transform") return;
      onExited();
    };

    sheet?.addEventListener("transitionend", onTransitionEnd);
    return () => {
      window.clearTimeout(timer);
      sheet?.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [phase, onExited, sheetRef]);

  return (
    <div
      className="mobile-drawer"
      role="dialog"
      aria-label="Settings"
      data-state={phase}
    >
      <div
        className="mobile-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`mobile-drawer-sheet${isExpanded ? " is-expanded" : ""}`}
        ref={sheetRef}
        data-mobile-tab={mobileTab}
      >
        <div
          className="mobile-drawer-handle"
          ref={handleRef}
          aria-hidden="true"
          {...handleProps}
        />
        <div className="mobile-drawer-content">
          {/* The settings panel loads as its own chunk. Without this boundary
              React throws when the chunk suspends during a tap. */}
          <Suspense
            fallback={
              <div className="mobile-drawer-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            }
          >
            <SettingsPanel mobileTab={mobileTab} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { state, dispatch } = usePosterContext();

  // Fire once-per-session analytics on load (app_open).
  useSessionAnalytics();
  // Keep bottom-anchored UI clear of Mediavine's adhesion ad.
  useAdhesionOffset();
  const { isMarkerEditorActive } = state;
  const activeMarker =
    state.activeMarkerId !== null
      ? state.markers.find((marker) => marker.id === state.activeMarkerId) ?? null
      : null;

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>("theme");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // The drawer stays in the DOM until its exit transition ends.
  const [mobileDrawerMounted, setMobileDrawerMounted] = useState(false);
  const [mobileLocationRowVisible, setMobileLocationRowVisible] =
    useState(true);
  // Read the viewport before the first render. A false start would mount the
  // desktop panel on a phone for one frame, and then throw it away.
  const [isMobileViewport, setIsMobileViewport] = useState(matchesMobileViewport);

  // Desktop state
  const [desktopTab, setDesktopTab] = useState<MobileTab>("theme");
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const [desktopLocationRowVisible, setDesktopLocationRowVisible] =
    useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);
  // Two blocking dialogs must not share the screen. The location dialog comes
  // first, because the app cannot draw a poster without a location. The
  // release notes wait for this flag.
  const [isStartupLocationDone, setIsStartupLocationDone] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setLegalDoc((e as CustomEvent<LegalDocDetail>).detail.doc);
    };
    window.addEventListener(LEGAL_DOC_EVENT, handler);
    return () => window.removeEventListener(LEGAL_DOC_EVENT, handler);
  }, []);

  useEffect(() => {
    const preload = () => {
      void import("@/features/poster/ui/SettingsPanel");
      void import("@/shared/ui/DesktopLocationBar");
      void import("@/features/export/ui/ExportFab");
      void import("@/features/updates/ui/AnnouncementModal");
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(preload, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [mobileDrawerOpen]);

  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const unmountMobileDrawer = useCallback(
    () => setMobileDrawerMounted(false),
    [],
  );

  const handleMobileTabChange = (tab: MobileTab) => {
    if (tab === "location") {
      setMobileLocationRowVisible((isVisible) => !isVisible);
      setMobileDrawerOpen(false);
      return;
    }

    if (tab === mobileTab && mobileDrawerOpen) {
      setMobileDrawerOpen(false);
    } else {
      setMobileTab(tab);
      setMobileDrawerMounted(true);
      setMobileDrawerOpen(true);
    }
  };

  const handleDesktopTabChange = (tab: MobileTab) => {
    if (tab === desktopTab && desktopPanelOpen) {
      setDesktopPanelOpen(false);
    } else {
      setDesktopTab(tab);
      setDesktopPanelOpen(true);
    }
  };

  const handleMobileMarkerSizeChange = useCallback(
    (nextSize: number) => {
      if (!activeMarker) {
        return;
      }
      const clampedSize = Math.max(
        MIN_MARKER_SIZE,
        Math.min(MAX_MARKER_SIZE, Math.round(nextSize)),
      );
      dispatch({
        type: "UPDATE_MARKER",
        markerId: activeMarker.id,
        changes: { size: clampedSize },
      });
    },
    [activeMarker, dispatch],
  );

  return (
    <div
      className="app-shell"
      data-mobile-tab={mobileTab}
      data-desktop-tab={desktopTab}
    >
      <GeneralHeader onAboutOpen={() => setAboutOpen(true)} />
      <InstallPrompt />
      <StartupLocationModal
        onComplete={() => setIsStartupLocationDone(true)}
      />

      <DesktopNavBar
        activeTab={desktopTab}
        panelOpen={desktopPanelOpen}
        onTabChange={handleDesktopTabChange}
        isLocationVisible={desktopLocationRowVisible}
        onLocationToggle={() =>
          setDesktopLocationRowVisible((isVisible) => !isVisible)
        }
      />

      <div
        className={`desktop-location-row-wrap${desktopLocationRowVisible ? "" : " is-hidden"}`}
      >
        <Suspense fallback={null}>
          <DesktopLocationBar />
        </Suspense>
      </div>

      <div
        className={`mobile-location-row-wrap${mobileLocationRowVisible ? "" : " is-hidden"}`}
      >
        <Suspense fallback={null}>
          <DesktopLocationBar />
        </Suspense>
      </div>
      {isMobileViewport && isMarkerEditorActive && activeMarker ? (
        <div
          className="mobile-marker-size-bar"
          role="group"
          aria-label="Selected marker size"
        >
          <p className="mobile-marker-size-bar__label">Marker Size</p>
          <div className="mobile-marker-size-bar__controls">
            <input
              type="range"
              className="mobile-marker-size-bar__slider map-control-slider"
              min={MIN_MARKER_SIZE}
              max={MAX_MARKER_SIZE}
              step={1}
              value={Math.round(activeMarker.size)}
              onChange={(event) =>
                handleMobileMarkerSizeChange(Number(event.target.value))
              }
            />
            <span className="mobile-marker-size-bar__value">
              {Math.round(activeMarker.size)}px
            </span>
          </div>
        </div>
      ) : null}

      {/* The mobile drawer holds its own settings panel. Mount this one only
          when the desktop layout applies. A hidden panel still runs every
          hook and redraws on every change to the poster. */}
      {isMobileViewport ? null : (
        <div className="desktop-left-panel">
          <div
            className={`desktop-settings-slide${desktopPanelOpen ? " is-open" : ""}`}
          >
            <Suspense fallback={null}>
              <SettingsPanel />
            </Suspense>
          </div>
        </div>
      )}

      <PreviewPanel />

      {mobileDrawerMounted ? (
        <SettingsDrawer
          mobileTab={mobileTab}
          open={mobileDrawerOpen}
          onClose={closeMobileDrawer}
          onExited={unmountMobileDrawer}
        />
      ) : null}

      {isMobileViewport && isMarkerEditorActive ? (
        <button
          type="button"
          className="mobile-marker-edit-done"
          onClick={() => {
            dispatch({ type: "SET_MARKER_EDITOR_ACTIVE", active: false });
            dispatch({ type: "SET_ACTIVE_MARKER", markerId: null });
            setMobileDrawerOpen(false);
          }}
        >
          <CheckIcon />
          <span>Done Editing</span>
        </button>
      ) : null}

      <MobileNavBar
        activeTab={mobileTab}
        drawerOpen={mobileDrawerOpen}
        isLocationVisible={mobileLocationRowVisible}
        onTabChange={handleMobileTabChange}
      />
      <Suspense fallback={null}>
        <ExportFab isMobile={isMobileViewport} />
      </Suspense>

      <FooterNote />
      {isStartupLocationDone ? (
        <Suspense fallback={null}>
          <AnnouncementModal />
        </Suspense>
      ) : null}
      {aboutOpen ? (
        <Suspense fallback={null}>
          <AboutModal onClose={() => setAboutOpen(false)} />
        </Suspense>
      ) : null}
      {legalDoc ? (
        <Suspense fallback={null}>
          <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}
