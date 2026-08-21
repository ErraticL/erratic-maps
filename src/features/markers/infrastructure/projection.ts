import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { TILE_SIZE_PX } from "@/core/config";

function latLonToWorld(lat: number, lon: number, zoom: number) {
  const worldSize = TILE_SIZE_PX * Math.pow(2, zoom);
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * worldSize,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize,
    worldSize,
  };
}

export function projectMarkerToCanvas(
  lat: number,
  lon: number,
  input: MarkerProjectionInput,
) {
  const center = latLonToWorld(input.centerLat, input.centerLon, input.zoom);
  const point = latLonToWorld(lat, lon, input.zoom);

  let dx = point.x - center.x;
  const dy = point.y - center.y;
  const halfWorld = point.worldSize / 2;

  if (dx > halfWorld) dx -= point.worldSize;
  if (dx < -halfWorld) dx += point.worldSize;

  const angle = (-input.bearingDeg * Math.PI) / 180;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  const rotatedX = dx * cosAngle - dy * sinAngle;
  const rotatedY = dx * sinAngle + dy * cosAngle;

  // MapLibre draws the map center at the center of the PADDED box, not
  // at the center of the canvas. A sheet with a mat therefore moves
  // every point by the same offset, and the marker follows it.
  return {
    x: input.canvasWidth / 2 + (input.centerOffsetX ?? 0) + rotatedX,
    y: input.canvasHeight / 2 + (input.centerOffsetY ?? 0) + rotatedY,
  };
}
