import type { SheetGeometry } from "@/features/poster/domain/sheet";

interface SheetMatProps {
  geometry: SheetGeometry;
  color: string;
}

/**
 * The mat of the sheet: the paper around the map hole.
 *
 * One SVG path holds the whole sheet and the hole, and the even-odd
 * fill rule cuts the hole out of it. The canvas compositor fills the
 * same path string, so the preview and the export show the same shape.
 */
export default function SheetMat({ geometry, color }: SheetMatProps) {
  if (!geometry.hasMat) {
    return null;
  }

  const { width, height, holePath } = geometry;
  const sheetPath = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      className="poster-mat"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={`${sheetPath} ${holePath}`} fill={color} fillRule="evenodd" />
    </svg>
  );
}
