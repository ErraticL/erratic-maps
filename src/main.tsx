import React from "react";
import ReactDOM from "react-dom/client";
import { isNativePlatform, onPlatformAdapterChange } from "@/core/platform";
import App from "./App";

// Self-hosted UI typefaces. These replace the Google Fonts stylesheet that
// base.css used to @import, which leaked visitor IPs to Google on every load.
// Weights mirror that stylesheet exactly, so rendering is unchanged.
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/spline-sans-mono/400.css";
import "@fontsource/spline-sans-mono/500.css";
import "@fontsource/bebas-neue/400.css";

// Default poster typefaces. Every poster falls back to these when no custom
// font is chosen, but nothing ever loaded them — until now they silently
// degraded to the generic sans/mono stack. Weights match preview.css.
import "@fontsource/space-grotesk/300.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-mono/300.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/700.css";

import "./styles/index.css";

// After a deploy, the Pages edge can serve the new index.html up to
// about a minute before every hashed chunk propagates. A visitor in
// that window gets a failed dynamic import and a blank app. Vite fires
// "vite:preloadError" for exactly this case; one reload fetches a
// consistent deployment. The sessionStorage flag stops a reload loop
// when the chunk stays missing; it resets after the next good load.
const PRELOAD_RELOAD_FLAG = "erratic-maps:preload-reloaded";
window.addEventListener("vite:preloadError", (event) => {
  if (sessionStorage.getItem(PRELOAD_RELOAD_FLAG)) {
    return; // Already reloaded once; let the error surface.
  }
  sessionStorage.setItem(PRELOAD_RELOAD_FLAG, "1");
  event.preventDefault();
  window.location.reload();
});
// Clear the flag only after the app survives a while: a reload that
// fails again does so within seconds, and clearing on "load" would
// re-arm the guard too early and allow a reload loop.
window.setTimeout(() => {
  sessionStorage.removeItem(PRELOAD_RELOAD_FLAG);
}, 15_000);

const syncDisplayMode = () => {
  const isStandalone =
    isNativePlatform() ||
    !!(window as unknown as Record<string, unknown>).Capacitor ||
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari PWA fallback.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  document.documentElement.dataset.displayMode = isStandalone
    ? "standalone"
    : "browser";
};

syncDisplayMode();
onPlatformAdapterChange(syncDisplayMode);
const displayModeQuery = window.matchMedia("(display-mode: standalone)");
if (typeof displayModeQuery.addEventListener === "function") {
  displayModeQuery.addEventListener("change", syncDisplayMode);
} else {
  displayModeQuery.onchange = syncDisplayMode;
}

if ("serviceWorker" in navigator && !isNativePlatform()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
