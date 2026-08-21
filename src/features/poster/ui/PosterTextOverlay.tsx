import { formatCoordinates } from "@/shared/geo/posterBounds";
import { APP_CREDIT_URL } from "@/core/config";
import {
  TEXT_DIMENSION_REFERENCE_PX,
  TEXT_BLOCK_CITY_RATIO,
  TEXT_BLOCK_DIVIDER_RATIO,
  TEXT_BLOCK_COUNTRY_RATIO,
  TEXT_BLOCK_COORDS_RATIO,
  TEXT_EDGE_MARGIN_RATIO,
  CITY_FONT_BASE_PX,
  COUNTRY_FONT_BASE_PX,
  COORDS_FONT_BASE_PX,
  ATTRIBUTION_FONT_BASE_PX,
  TERRAIN_CREDIT_TEXT,
  TERRAIN_CREDIT_LINE_STEP,
  formatCityLabel,
  computeCityFontScale,
  computeAttributionColor,
} from "@/features/poster/domain/textLayout";
import type { SheetGeometry } from "@/features/poster/domain/sheet";

interface PosterTextOverlayProps {
  city: string;
  country: string;
  lat: number;
  lon: number;
  fontFamily: string;
  textColor: string;
  landColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  showTerrainCredit: boolean;
  showOverlay: boolean;
  /** The geometry of the sheet, which holds the text block. */
  geometry: SheetGeometry;
}

/**
 * DOM-based poster text overlay (sharp at any resolution, GPU-composited).
 * Renders city name, divider, country, coordinates, and attribution
 * positioned to match the canvas export layout exactly.
 */
export default function PosterTextOverlay({
  city,
  country,
  lat,
  lon,
  fontFamily,
  textColor,
  landColor,
  showPosterText,
  includeCredits,
  showTerrainCredit,
  showOverlay,
  geometry,
}: PosterTextOverlayProps) {
  const toCqMin = (px: number) => (px / TEXT_DIMENSION_REFERENCE_PX) * 100;
  const textBlock = geometry.text;
  // The sheet places the text block. These four numbers turn a ratio
  // inside the block into a percentage of the poster height, which is
  // what the CSS `top` of each line takes.
  const linePercent = (ratio: number) =>
    textBlock
      ? ((textBlock.y + textBlock.height * ratio) / geometry.height) * 100
      : 0;

  const titleFont = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFont = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const cityLabel = formatCityLabel(city);
  const cityFontSize = `${toCqMin(CITY_FONT_BASE_PX) * computeCityFontScale(city)}cqmin`;
  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX)}cqmin`;
  const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
  const attributionOpacity = showOverlay ? 0.55 : 0.9;

  return (
    <div className="poster-text-overlay" style={{ color: textColor }}>
      {showPosterText && textBlock && (
        <>
          <p
            className="poster-city"
            style={{
              fontFamily: titleFont,
              top: `${linePercent(TEXT_BLOCK_CITY_RATIO)}%`,
              fontSize: cityFontSize,
            }}
          >
            {cityLabel}
          </p>
          <hr
            className="poster-divider"
            style={{
              borderColor: textColor,
              top: `${linePercent(TEXT_BLOCK_DIVIDER_RATIO)}%`,
            }}
          />
          <p
            className="poster-country"
            style={{
              fontFamily: titleFont,
              top: `${linePercent(TEXT_BLOCK_COUNTRY_RATIO)}%`,
              fontSize: countryFontSize,
            }}
          >
            {country.toUpperCase()}
          </p>
          <p
            className="poster-coords"
            style={{
              fontFamily: bodyFont,
              top: `${linePercent(TEXT_BLOCK_COORDS_RATIO)}%`,
              fontSize: coordsFontSize,
            }}
          >
            {formatCoordinates(lat, lon)}
          </p>
        </>
      )}

      {includeCredits && (
        <span
          className="poster-attribution"
          style={{
            fontFamily: bodyFont,
            color: attributionColor,
            opacity: attributionOpacity,
            fontSize: attributionFontSize,
            bottom: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
            right: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
          }}
        >
          &copy; OpenStreetMap contributors
        </span>
      )}

      {/* The terrain line sits above the OpenStreetMap line, because
          the terrain is a second data source, not a second producer. */}
      {includeCredits && showTerrainCredit && (
        <span
          className="poster-attribution poster-attribution--terrain"
          style={{
            fontFamily: bodyFont,
            color: attributionColor,
            opacity: attributionOpacity,
            fontSize: attributionFontSize,
            bottom: `calc(${TEXT_EDGE_MARGIN_RATIO * 100}% + ${
              toCqMin(ATTRIBUTION_FONT_BASE_PX) * TERRAIN_CREDIT_LINE_STEP
            }cqmin)`,
            right: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
          }}
        >
          {TERRAIN_CREDIT_TEXT}
        </span>
      )}

      {includeCredits && (
        <span
          className="poster-credits"
          style={{
            fontFamily: bodyFont,
            color: attributionColor,
            opacity: attributionOpacity,
            fontSize: attributionFontSize,
            bottom: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
            left: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
          }}
        >
          © {APP_CREDIT_URL}
        </span>
      )}
    </div>
  );
}
