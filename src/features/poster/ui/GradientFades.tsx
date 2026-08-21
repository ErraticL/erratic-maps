import { withAlpha } from "@/shared/utils/color";
import type { SheetGeometry } from "@/features/poster/domain/sheet";

interface GradientFadesProps {
  color: string;
  geometry: SheetGeometry;
}

/**
 * CSS gradient overlays that fade the edges of the map hole. They match
 * `applyFades()` on the canvas and run on the GPU. The sheet model
 * decides which edges carry a fade and how tall it is.
 */
export default function GradientFades({ color, geometry }: GradientFadesProps) {
  const solid = withAlpha(color, 1);
  const transparent = withAlpha(color, 0);
  const { width, height, hole, fades } = geometry;
  const percentX = (value: number) => `${(value / width) * 100}%`;
  const percentY = (value: number) => `${(value / height) * 100}%`;
  const left = percentX(hole.x);
  const bandWidth = percentX(hole.width);

  return (
    <>
      {fades.top > 0 ? (
        <div
          className="poster-fade"
          style={{
            left,
            width: bandWidth,
            top: percentY(hole.y),
            height: percentY(fades.top),
            background: `linear-gradient(to bottom, ${solid}, ${transparent})`,
          }}
        />
      ) : null}
      {fades.bottom > 0 ? (
        <div
          className="poster-fade"
          style={{
            left,
            width: bandWidth,
            top: percentY(hole.y + hole.height - fades.bottom),
            height: percentY(fades.bottom),
            background: `linear-gradient(to top, ${solid}, ${transparent})`,
          }}
        />
      ) : null}
    </>
  );
}
