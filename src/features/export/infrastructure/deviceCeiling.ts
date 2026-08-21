import {
  BUDGET_LARGE_PIXELS,
  BUDGET_MEDIUM_PIXELS,
  type DeviceCeiling,
} from "../domain/resolution";
import { MAX_PIXELS, MAX_SIDE } from "@/features/poster/infrastructure/renderer/constants";

/**
 * What the device can hold.
 *
 * Two numbers describe it. The per-side limit comes from WebGL: a GL
 * canvas larger than MAX_RENDERBUFFER_SIZE does not exist, and the
 * value is 16384 on a current desktop and 4096 to 8192 on a phone. The
 * pixel budget comes from `navigator.deviceMemory`, which Chrome and
 * Edge report and other browsers do not.
 *
 * The budget limits the DEFAULT tier only. The picker goes up to the
 * WebGL limit, and every option above the budget carries a warning.
 * A live probe is not an option: it costs the same memory as the
 * export and proves little.
 */

/** Every browser holds at least this much per side. */
const FALLBACK_MAX_SIDE = MAX_SIDE;

/** No browser holds more, so a wrong report cannot raise the ceiling. */
const HIGHEST_MAX_SIDE = 16384;

let cachedCeiling: DeviceCeiling | null = null;

function readWebglMaxSide(): number {
  if (typeof document === "undefined") {
    return FALLBACK_MAX_SIDE;
  }

  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      return FALLBACK_MAX_SIDE;
    }

    // A canvas needs both a render buffer and a texture of its size, so
    // the smaller of the two limits is the real one.
    const renderbufferSide = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const textureSide = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const side = Math.min(
      Number.isFinite(renderbufferSide) ? renderbufferSide : 0,
      Number.isFinite(textureSide) ? textureSide : 0,
    );

    // The probe context is not needed after the read. Dropping it frees
    // the GPU slot again, because a browser keeps only a few contexts.
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    if (!(side > 0)) {
      return FALLBACK_MAX_SIDE;
    }
    return Math.min(HIGHEST_MAX_SIDE, Math.max(FALLBACK_MAX_SIDE, side));
  } catch {
    return FALLBACK_MAX_SIDE;
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/**
 * True for a phone or a tablet. Such a device reports a coarse pointer
 * and no hover. Its memory holds much less than the report of
 * `deviceMemory` suggests, because the browser shares it with the
 * system.
 */
function isHandheld(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(pointer: coarse) and (hover: none)").matches;
}

function readBudgetPixels(): number {
  if (isHandheld()) {
    return MAX_PIXELS;
  }

  const memoryGb = Number(
    (navigator as unknown as { deviceMemory?: number }).deviceMemory,
  );

  // Firefox and Safari report nothing. A desktop that stays quiet gets
  // the middle budget, which an A2 poster at 300 DPI fits.
  if (!Number.isFinite(memoryGb) || memoryGb <= 0) {
    return BUDGET_MEDIUM_PIXELS;
  }
  if (memoryGb >= 8) {
    return BUDGET_LARGE_PIXELS;
  }
  if (memoryGb >= 4) {
    return BUDGET_MEDIUM_PIXELS;
  }
  return MAX_PIXELS;
}

/**
 * Reads the ceiling once and keeps it. Neither number changes while
 * the page lives, and the WebGL probe costs a context.
 */
export function readDeviceCeiling(): DeviceCeiling {
  if (!cachedCeiling) {
    cachedCeiling = {
      maxSide: readWebglMaxSide(),
      budgetPixels: readBudgetPixels(),
    };
  }
  return cachedCeiling;
}
