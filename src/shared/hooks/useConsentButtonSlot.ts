import { useEffect, type RefObject } from "react";

/**
 * Mediavine's CMP injects its own "Update Privacy Settings" button, which is
 * the only way for a visitor to revisit their consent choices. It is appended
 * wherever their script decides, which on a full-screen app lands below the
 * fold instead of in the footer.
 *
 * Moves it into the given container so it sits with the other legal links.
 * Relocating the element keeps their click handler intact — rebuilding the
 * button ourselves would need an API they don't document.
 */
const CONSENT_WRAPPER_ID = "consumer-privacy-footer-wrapper";

export function useConsentButtonSlot(slotRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    let mutationObserver: MutationObserver | null = null;

    const relocate = () => {
      const wrapper = document.getElementById(CONSENT_WRAPPER_ID);
      const slot = slotRef.current;
      if (!wrapper || !slot || wrapper.parentElement === slot) return false;
      slot.appendChild(wrapper);
      return true;
    };

    if (!relocate()) {
      mutationObserver = new MutationObserver(() => {
        if (relocate()) mutationObserver?.disconnect();
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => mutationObserver?.disconnect();
  }, [slotRef]);
}
