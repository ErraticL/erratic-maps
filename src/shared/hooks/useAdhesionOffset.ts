import { useEffect } from "react";

/**
 * Mediavine renders its adhesion ad and sticky video into a fixed-position
 * container pinned to the bottom of the viewport, which would otherwise cover
 * the app's own bottom-anchored UI (desktop footer, mobile nav).
 *
 * Publishes that container's height as `--ad-adhesion-height` so those
 * elements can sit above it. The value tracks the live height, which varies by
 * breakpoint (desktop vs mobile adhesion) and grows when the sticky video
 * player opens; it stays 0px when no ad is present.
 */
const CONTAINER_ID = "fixed_container_bottom";
const CSS_VAR = "--ad-adhesion-height";

export function useAdhesionOffset(): void {
  useEffect(() => {
    const root = document.documentElement;
    let resizeObserver: ResizeObserver | null = null;

    const observe = (container: HTMLElement) => {
      const measure = () => {
        // Measure the overlap with the viewport bottom rather than the
        // element height: the container also holds collapsed/hidden wrappers
        // that shouldn't push the UI up.
        const { top, height } = container.getBoundingClientRect();
        const covered = height > 0 ? Math.max(0, window.innerHeight - top) : 0;
        root.style.setProperty(CSS_VAR, `${Math.round(covered)}px`);
      };
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(container);
      measure();
    };

    const existing = document.getElementById(CONTAINER_ID);
    if (existing) {
      observe(existing);
      return () => resizeObserver?.disconnect();
    }

    // Their script injects the container after load, so wait for it.
    const mutationObserver = new MutationObserver(() => {
      const container = document.getElementById(CONTAINER_ID);
      if (!container) return;
      mutationObserver.disconnect();
      observe(container);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, []);
}
