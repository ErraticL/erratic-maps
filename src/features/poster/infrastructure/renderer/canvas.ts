import { MAX_PIXELS, MAX_SIDE } from "./constants";
import type { CanvasSize } from "../../domain/types";
import type {
  CanvasLimits,
  ResolutionTier,
} from "@/features/export/domain/resolution";

/**
 * The caps of release 0.7. The tier "Standard" keeps them, and so does
 * every layered SVG export.
 */
export const STANDARD_LIMITS: CanvasLimits = {
  maxSide: MAX_SIDE,
  maxPixels: MAX_PIXELS,
};

/** The smallest print export, in pixels per side. */
const MIN_PRINT_SIDE = 600;

export interface CanvasSizeRequest {
  widthInches: number;
  heightInches: number;
  /** The named pixel size of a pixel layout. A print layout has none. */
  pixelWidth?: number;
  pixelHeight?: number;
  tier: ResolutionTier;
  limits: CanvasLimits;
}

/**
 * Turns the poster size and the chosen tier into the pixel size of the
 * export.
 *
 * A print tier multiplies the centimeters by its print resolution. A
 * pixel tier takes the named pixel size of the layout, one or two
 * times. The limits then cap the result; they carry the caps of
 * release 0.7 for the Standard tier and the WebGL limit of the device
 * for every other tier.
 *
 * The picker in the download dialog calls this function with the same
 * arguments as the export, so its readout always names the file the
 * visitor receives.
 */
export function resolveCanvasSize({
  widthInches,
  heightInches,
  pixelWidth = 0,
  pixelHeight = 0,
  tier,
  limits,
}: CanvasSizeRequest): CanvasSize {
  const usesNamedPixels =
    tier.kind === "pixel" && pixelWidth > 0 && pixelHeight > 0;

  // A print poster keeps a floor, because a poster of four centimeters
  // would otherwise export as a thumbnail. A pixel layout takes no
  // floor: its named size is the answer the visitor asked for.
  const floor = usesNamedPixels ? 1 : MIN_PRINT_SIDE;

  const requestedWidth = usesNamedPixels
    ? Math.round(pixelWidth * tier.scale)
    : Math.max(floor, Math.round(widthInches * tier.dpi));
  const requestedHeight = usesNamedPixels
    ? Math.round(pixelHeight * tier.scale)
    : Math.max(floor, Math.round(heightInches * tier.dpi));

  const totalPixels = requestedWidth * requestedHeight;
  const longestSide = Math.max(requestedWidth, requestedHeight);

  const areaFactor =
    totalPixels > limits.maxPixels
      ? Math.sqrt(limits.maxPixels / totalPixels)
      : 1;
  const sideFactor =
    longestSide > limits.maxSide ? limits.maxSide / longestSide : 1;

  const factor = Math.min(areaFactor, sideFactor, 1);
  const width = Math.max(floor, Math.round(requestedWidth * factor));
  const height = Math.max(floor, Math.round(requestedHeight * factor));

  return {
    width,
    height,
    requestedWidth,
    requestedHeight,
    downscaleFactor: factor,
    // The real print resolution of the file, not the one the tier asked
    // for. The PNG carries it in its pHYs chunk, so a print shop opens
    // the file at the size it really holds.
    dpi: widthInches > 0 ? width / widthInches : 0,
  };
}
