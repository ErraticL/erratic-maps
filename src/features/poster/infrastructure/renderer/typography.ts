import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { Coordinate } from "@/shared/geo/types";
import type { Rect } from "@/features/poster/domain/sheet";
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
  isLatinScript,
  formatCityLabel,
  computeCityFontScale,
  computeAttributionColor,
} from "@/features/poster/domain/textLayout";

export function drawPosterText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: { ui?: { text?: string } },
  center: Coordinate,
  city: string,
  country: string,
  fontFamily: string | undefined,
  showPosterText: boolean,
  showOverlay: boolean,
  includeCredits: boolean = true,
  showTerrainCredit: boolean = false,
  /**
   * The box that the sheet reserves for the text block. Null means the
   * sheet carries no text block, and the four poster lines stay away.
   */
  textBlock: Rect | null = null,
): void {
  const textColor = theme.ui?.text || "#111111";
  const landColor = theme.map?.land || "#808080";
  const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
  const attributionAlpha = showOverlay ? 0.55 : 0.9;
  const titleFontFamily = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFontFamily = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const dimScale = Math.max(
    0.45,
    Math.min(width, height) / TEXT_DIMENSION_REFERENCE_PX,
  );
  const attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale;

  if (showPosterText && textBlock) {
    const cityLabel = formatCityLabel(city);
    const cityFontSize = CITY_FONT_BASE_PX * dimScale * computeCityFontScale(city);

    const countryFontSize = COUNTRY_FONT_BASE_PX * dimScale;
    const coordinateFontSize = COORDS_FONT_BASE_PX * dimScale;
    const cityY = textBlock.y + textBlock.height * TEXT_BLOCK_CITY_RATIO;
    const lineY = textBlock.y + textBlock.height * TEXT_BLOCK_DIVIDER_RATIO;
    const countryY = textBlock.y + textBlock.height * TEXT_BLOCK_COUNTRY_RATIO;
    const coordinatesY =
      textBlock.y + textBlock.height * TEXT_BLOCK_COORDS_RATIO;

    const blockCenterX = textBlock.x + textBlock.width * 0.5;

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    ctx.fillText(cityLabel, blockCenterX, cityY);

    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3 * dimScale;
    ctx.beginPath();
    ctx.moveTo(textBlock.x + textBlock.width * 0.4, lineY);
    ctx.lineTo(textBlock.x + textBlock.width * 0.6, lineY);
    ctx.stroke();

    ctx.font = `300 ${countryFontSize}px ${titleFontFamily}`;
    ctx.fillText(country.toUpperCase(), blockCenterX, countryY);

    ctx.globalAlpha = 0.75;
    ctx.font = `400 ${coordinateFontSize}px ${bodyFontFamily}`;
    ctx.fillText(
      formatCoordinates(center.lat, center.lon),
      blockCenterX,
      coordinatesY,
    );
    ctx.globalAlpha = 1;
  }

  // `includeCredits` controls both credit lines. The site stays
  // attributed through its footer; the poster is the user's produced work.
  if (!includeCredits) return;

  ctx.fillStyle = attributionColor;
  ctx.globalAlpha = attributionAlpha;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
  ctx.fillText(
    "\u00a9 OpenStreetMap contributors",
    width * (1 - TEXT_EDGE_MARGIN_RATIO),
    height * (1 - TEXT_EDGE_MARGIN_RATIO),
  );

  // The terrain line sits above the OpenStreetMap line, because the
  // terrain is a second data source, not a second producer.
  if (showTerrainCredit) {
    ctx.fillText(
      TERRAIN_CREDIT_TEXT,
      width * (1 - TEXT_EDGE_MARGIN_RATIO),
      height * (1 - TEXT_EDGE_MARGIN_RATIO) -
        attributionFontSize * TERRAIN_CREDIT_LINE_STEP,
    );
  }

  ctx.textAlign = "left";
  ctx.fillText(
    `© ${APP_CREDIT_URL}`,
    width * TEXT_EDGE_MARGIN_RATIO,
    height * (1 - TEXT_EDGE_MARGIN_RATIO),
  );
  ctx.globalAlpha = 1;
}
