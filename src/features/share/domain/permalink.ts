/**
 * Permalink codec (pure). A poster's shareable state is encoded in the
 * URL hash so a link restores location, distance, theme, layout and
 * the display names:
 *
 *   #loc=52.375900,9.732000&d=4000&theme=classic&layout=a4-portrait
 *       &city=Hanover&country=Germany
 *
 * Only `loc` is required. Unknown parameters are ignored, so the
 * format can grow without breaking old links. Validation against the
 * theme and layout registries happens in the caller — this module
 * stays free of imports.
 *
 * A key appears only when its value differs from the default. The
 * plate keys are `lw` (line weight), `fills` and `casings`. The key
 * `off` lists the content layers that the poster hides, for example
 * `off=parks,rail`. The relief keys are `cont` (the contour interval)
 * and `hs` (the hillshade strength); each appears only while its
 * switch is on. A missing key means the default value, not "keep the
 * value the app shows now".
 */

export interface PermalinkData {
  lat: number;
  lon: number;
  distanceMeters?: number;
  themeId?: string;
  layoutId?: string;
  widthCm?: number;
  heightCm?: number;
  city?: string;
  country?: string;
  plateWeight?: number;
  plateFills?: string;
  plateCasings?: boolean;
  layersOff?: string[];
  /** The contour interval. Absent means the contour lines are off. */
  contourInterval?: string;
  /** The hillshade strength. Absent means the hillshade is off. */
  hillshadeStrength?: string;
}

const DEFAULT_PLATE_WEIGHT = 1;
const DEFAULT_PLATE_FILLS = "solid";

function finiteInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function parsePermalinkHash(hash: string): PermalinkData | null {
  const raw = String(hash ?? "").replace(/^#/, "");
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const loc = String(params.get("loc") ?? "").split(",");
  if (loc.length !== 2) return null;

  const lat = Number(loc[0]);
  const lon = Number(loc[1]);
  if (!finiteInRange(lat, -90, 90) || !finiteInRange(lon, -180, 180)) {
    return null;
  }

  const data: PermalinkData = { lat, lon };

  const distance = Number(params.get("d"));
  if (Number.isFinite(distance) && distance > 0) {
    data.distanceMeters = distance;
  }

  const themeId = String(params.get("theme") ?? "").trim();
  if (themeId) data.themeId = themeId;

  const layoutId = String(params.get("layout") ?? "").trim();
  if (layoutId) data.layoutId = layoutId;

  const widthCm = Number(params.get("w"));
  const heightCm = Number(params.get("h"));
  if (Number.isFinite(widthCm) && widthCm > 0) data.widthCm = widthCm;
  if (Number.isFinite(heightCm) && heightCm > 0) data.heightCm = heightCm;

  const city = String(params.get("city") ?? "").trim();
  if (city) data.city = city;

  const country = String(params.get("country") ?? "").trim();
  if (country) data.country = country;

  const lineWeight = Number(params.get("lw"));
  if (Number.isFinite(lineWeight) && lineWeight > 0) {
    data.plateWeight = lineWeight;
  }

  const fills = String(params.get("fills") ?? "").trim();
  if (fills) data.plateFills = fills;

  const casings = params.get("casings");
  if (casings !== null) data.plateCasings = casings !== "0";

  const contourInterval = String(params.get("cont") ?? "").trim();
  if (contourInterval) data.contourInterval = contourInterval;

  const hillshadeStrength = String(params.get("hs") ?? "").trim();
  if (hillshadeStrength) data.hillshadeStrength = hillshadeStrength;

  const layersOff = String(params.get("off") ?? "").trim();
  if (layersOff) {
    data.layersOff = layersOff
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  }

  return data;
}

export function buildPermalinkHash(data: PermalinkData): string {
  const params = new URLSearchParams();
  params.set("loc", `${data.lat.toFixed(6)},${data.lon.toFixed(6)}`);
  if (data.distanceMeters) params.set("d", String(Math.round(data.distanceMeters)));
  if (data.themeId) params.set("theme", data.themeId);
  if (data.layoutId) params.set("layout", data.layoutId);
  if (data.widthCm) params.set("w", String(data.widthCm));
  if (data.heightCm) params.set("h", String(data.heightCm));
  if (data.city) params.set("city", data.city);
  if (data.country) params.set("country", data.country);
  if (data.plateWeight && data.plateWeight !== DEFAULT_PLATE_WEIGHT) {
    params.set("lw", String(data.plateWeight));
  }
  if (data.plateFills && data.plateFills !== DEFAULT_PLATE_FILLS) {
    params.set("fills", data.plateFills);
  }
  if (data.plateCasings === false) params.set("casings", "0");
  if (data.contourInterval) params.set("cont", data.contourInterval);
  if (data.hillshadeStrength) params.set("hs", data.hillshadeStrength);
  if (data.layersOff && data.layersOff.length > 0) {
    params.set("off", data.layersOff.join(","));
  }
  return "#" + params.toString();
}
