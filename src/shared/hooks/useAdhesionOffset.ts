import { useEffect } from "react";

/**
 * Mediavine pins its adhesion ad to the bottom of the viewport, where it would
 * cover the app's own bottom-anchored UI (footer, nav, export button).
 *
 * Publishes how far that ad reaches up the viewport as `--ad-adhesion-height`
 * so those elements can sit above it, and 0 when no ad is showing.
 *
 * Their markup is not a stable contract — wrapper classes and per-breakpoint
 * containers change — so rather than matching a specific class, this measures
 * every candidate they render and keeps whichever is actually flush with the
 * bottom of the viewport. Collapsed and off-screen wrappers contribute nothing.
 */
// Only the individual ad slots, never Mediavine's outer container: that one is
// also flush with the bottom but reserves room for the hidden video player, so
// measuring it pushes the UI hundreds of pixels up.
const CANDIDATES = "#fixed_container_bottom > *, .adhesion_wrapper";
const CSS_VAR = "--ad-adhesion-height";
// Treat "within a few px of the bottom" as flush, to absorb sub-pixel layout.
const BOTTOM_TOLERANCE_PX = 4;
// An adhesion bar is a banner; anything taller is a container we shouldn't clear.
const MAX_PLAUSIBLE_HEIGHT_PX = 250;

export function useAdhesionOffset(): void {
  useEffect(() => {
    const root = document.documentElement;

    const measure = () => {
      let covered = 0;
      for (const el of document.querySelectorAll<HTMLElement>(CANDIDATES)) {
        // Mediavine keeps unfilled slots mounted but hidden; they reserve
        // layout space, so height alone isn't enough to tell them apart.
        if (getComputedStyle(el).visibility === "hidden") continue;

        const rect = el.getBoundingClientRect();
        const isFlushWithBottom =
          Math.abs(rect.bottom - window.innerHeight) <= BOTTOM_TOLERANCE_PX;
        if (
          isFlushWithBottom &&
          rect.height > 0 &&
          rect.height <= MAX_PLAUSIBLE_HEIGHT_PX
        ) {
          covered = Math.max(covered, rect.height);
        }
      }
      root.style.setProperty(CSS_VAR, `${Math.round(covered)}px`);
    };

    // Ad scripts mutate the DOM constantly and each measure forces layout, so
    // coalesce bursts into a single read per frame.
    let frame = 0;
    const scheduleMeasure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();

    // The ad is injected after load, resizes between breakpoints, and can be
    // dismissed, so re-measure on DOM changes as well as viewport resizes.
    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, []);
}
