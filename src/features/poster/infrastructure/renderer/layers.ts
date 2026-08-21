import { withAlpha } from "@/shared/utils/color";
import type { SheetGeometry } from "@/features/poster/domain/sheet";

/**
 * Paints the gradient fades of the sheet.
 *
 * A fade belongs to the map hole, not to the paper: it starts solid at
 * an edge of the hole and reaches into it. The sheet model decides
 * which edges carry one. Decision 17 of the roadmap: a fade exists
 * only where a text block draws over the map hole.
 */
export function applyFades(
  ctx: CanvasRenderingContext2D,
  geometry: SheetGeometry,
  color: string,
): void {
  const { hole, fades } = geometry;
  const holeBottom = hole.y + hole.height;

  if (fades.top > 0) {
    const gradient = ctx.createLinearGradient(0, hole.y, 0, hole.y + fades.top);
    gradient.addColorStop(0, withAlpha(color, 1));
    gradient.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(hole.x, hole.y, hole.width, fades.top);
  }

  if (fades.bottom > 0) {
    const gradient = ctx.createLinearGradient(
      0,
      holeBottom,
      0,
      holeBottom - fades.bottom,
    );
    gradient.addColorStop(0, withAlpha(color, 1));
    gradient.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(
      hole.x,
      holeBottom - fades.bottom,
      hole.width,
      fades.bottom,
    );
  }
}

/**
 * Paints the mat: the whole sheet in the background color, minus the
 * hole. The hole comes from the same path string that the DOM preview
 * uses, so the preview and the file cannot drift apart.
 */
export function applyMat(
  ctx: CanvasRenderingContext2D,
  geometry: SheetGeometry,
  color: string,
): void {
  if (!geometry.hasMat) {
    return;
  }

  const path = new Path2D();
  path.rect(0, 0, geometry.width, geometry.height);
  path.addPath(new Path2D(geometry.holePath));

  ctx.save();
  ctx.fillStyle = withAlpha(color, 1);
  ctx.fill(path, "evenodd");
  ctx.restore();
}
