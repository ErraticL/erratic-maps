import type { IconType } from "react-icons";

export type MarkerIconSource = "predefined" | "custom";
export type MarkerIconKind = "svg" | "image";

export interface MarkerIconDefinition {
  id: string;
  label: string;
  source: MarkerIconSource;
  kind: MarkerIconKind;
  tintWithMarkerColor?: boolean;
  component?: IconType;
  svgMarkup?: string;
  dataUrl?: string;
}

export interface MarkerItem {
  id: string;
  lat: number;
  lon: number;
  iconId: string;
  size: number;
  color: string;
}

export interface MarkerDefaults {
  size: number;
  color: string;
}

export interface MarkerProjectionInput {
  centerLat: number;
  centerLon: number;
  zoom: number;
  bearingDeg: number;
  canvasWidth: number;
  canvasHeight: number;
  /**
   * How far MapLibre draws the map center away from the center of the
   * canvas, in canvas pixels. A sheet with a mat gives the map a
   * padding, and MapLibre then draws the center of the map at the
   * center of the padded box. Zero without a padding.
   */
  centerOffsetX?: number;
  centerOffsetY?: number;
}
