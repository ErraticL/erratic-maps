import { useEffect } from "react";

/**
 * Mediavine pins its adhesion ad to the bottom of the viewport, where it would
 * cover the app's own bottom-anchored UI (desktop footer, mobile nav).
 *
 * Publishes the adhesion bar's height as `--ad-adhesion-height` so those
 * elements can sit above it. The value tracks the live height, which differs
 * between the desktop and mobile units, and is 0 when no ad renders.
 *
 * Measures the adhesion wrapper itself rather than Mediavine's outer fixed
 * container: that container also holds the sticky video player, which floats
 * in the corner and is far taller than the bar actually blocking the footer.
 */
const ADHESION_SELECTOR = ".adhesion_wrapper";
const CSS_VAR = "--ad-adhesion-height";

export function useAdhesionOffset(): void {
  useEffect(() => {
    const root = document.documentElement;
    let resizeObserver: ResizeObserver | null = null;

    const observe = (bars: HTMLElement[]) => {
      // Mediavine ships a wrapper per breakpoint and leaves the inactive ones
      // in the DOM, so measure how much of the viewport bottom each actually
      // covers rather than trusting its height: a wrapper that is collapsed or
      // parked off-screen then contributes nothing.
      const measure = () => {
        const covered = bars.reduce((max, bar) => {
          const rect = bar.getBoundingClientRect();
          const overlap = Math.min(
            Math.max(window.innerHeight - rect.top, 0),
            rect.height,
          );
          return Math.max(max, overlap);
        }, 0);
        root.style.setProperty(CSS_VAR, `${Math.round(covered)}px`);
      };
      resizeObserver = new ResizeObserver(measure);
      bars.forEach((bar) => resizeObserver?.observe(bar));
      measure();
    };

    const find = () =>
      Array.from(document.querySelectorAll<HTMLElement>(ADHESION_SELECTOR));

    const existing = find();
    if (existing.length > 0) {
      observe(existing);
      return () => resizeObserver?.disconnect();
    }

    // Their script injects the bar after load, so wait for it.
    const mutationObserver = new MutationObserver(() => {
      const bars = find();
      if (bars.length === 0) return;
      mutationObserver.disconnect();
      observe(bars);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, []);
}
