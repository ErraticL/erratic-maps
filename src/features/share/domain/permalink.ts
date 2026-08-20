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
}

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
  return "#" + params.toString();
}
