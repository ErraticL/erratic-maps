export interface ThemeUiColors {
  bg: string;
  text: string;
}

export interface ThemeRoadColors {
  major: string;
  minor_high: string;
  minor_mid: string;
  minor_low: string;
  path: string;
  outline: string;
}

export interface ThemeMapColors {
  land: string;
  landcover: string;
  water: string;
  waterway: string;
  parks: string;
  buildings: string;
  /**
   * Optional three-tone building fill keyed on rendered height:
   * [low (< 10 m), mid (10–24 m), tall (>= 24 m)]. When present, the map
   * colors buildings by height; `buildings` stays the single mid tone for
   * palettes, the editor, and fallbacks. Themes opt in via a
   * `buildings_triad` array in themes.json.
   */
  buildingsTriad?: [string, string, string];
  aeroway: string;
  rail: string;
  roads: ThemeRoadColors;
}

export interface ThemeColors {
  ui: ThemeUiColors;
  map: ThemeMapColors;
}

export interface ResolvedTheme extends ThemeColors {
  name: string;
  description: string;
}

export type ThemeColorKey =
  | "ui.bg"
  | "ui.text"
  | "map.land"
  | "map.landcover"
  | "map.water"
  | "map.waterway"
  | "map.parks"
  | "map.buildings"
  | "map.aeroway"
  | "map.rail"
  | "map.roads.major"
  | "map.roads.minor_high"
  | "map.roads.minor_mid"
  | "map.roads.minor_low"
  | "map.roads.path"
  | "map.roads.outline";

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  palette: string[];
  /**
   * Colors that the palette keys do not carry but that define the theme,
   * for example the `buildings_triad`. The theme card appends them to its
   * swatch strip. Absent for a theme without such colors.
   */
  accentColors?: string[];
}

export const DISPLAY_PALETTE_KEYS: ThemeColorKey[] = [
  "ui.bg",
  "ui.text",
  "map.land",
  "map.landcover",
  "map.water",
  "map.waterway",
  "map.parks",
  "map.buildings",
  "map.aeroway",
  "map.rail",
  "map.roads.major",
  "map.roads.minor_high",
  "map.roads.minor_mid",
  "map.roads.minor_low",
  "map.roads.path",
  "map.roads.outline",
];

export const PALETTE_COLOR_LABELS: Record<ThemeColorKey, string> = {
  "ui.bg": "Overlay",
  "ui.text": "Text",
  "map.land": "Land",
  "map.landcover": "Landcover",
  "map.water": "Water",
  "map.waterway": "Waterways",
  "map.parks": "Parks",
  "map.buildings": "Buildings",
  "map.aeroway": "Aeroway",
  "map.rail": "Rail",
  "map.roads.major": "Roads Major",
  "map.roads.minor_high": "Roads Minor High",
  "map.roads.minor_mid": "Roads Minor Mid",
  "map.roads.minor_low": "Roads Minor Low",
  "map.roads.path": "Roads Path",
  "map.roads.outline": "Road Outline",
};
