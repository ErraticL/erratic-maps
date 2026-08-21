/**
 * The plate: the drawing rules of the map.
 *
 * The poster has four independent dimensions: theme (colors), plate
 * (drawing rules), sheet (composition) and layers (content). The plate
 * holds no content switch. A content switch stays in the Layers
 * section.
 *
 * Three rules make the first version:
 * - weight: one factor on every line width, from 0.5 to 2
 * - fills: solid polygons, or the outline of the polygon only
 * - casings: the halo under the roads, on or off
 *
 * The named plates below set all three rules at once. The building
 * mode (one tone or triad) is not a plate rule. It stays with the
 * theme, because a theme without triad colors cannot offer it.
 */

export type PlateFills = "solid" | "outline";

export interface Plate {
  weight: number;
  fills: PlateFills;
  casings: boolean;
}

export const MIN_PLATE_WEIGHT = 0.5;
export const MAX_PLATE_WEIGHT = 2;
export const PLATE_WEIGHT_STEP = 0.1;

/** The default plate draws the poster of release 0.5. */
export const DEFAULT_PLATE: Plate = {
  weight: 1,
  fills: "solid",
  casings: true,
};

export interface PlateOption {
  id: string;
  name: string;
  description: string;
  plate: Plate;
}

export const plateOptions: PlateOption[] = [
  {
    id: "full",
    name: "Full",
    description: "Solid fills and road casings.",
    plate: { weight: 1, fills: "solid", casings: true },
  },
  {
    id: "line",
    name: "Line",
    description: "Outlines only, no casings.",
    plate: { weight: 1, fills: "outline", casings: false },
  },
  {
    id: "bold",
    name: "Bold",
    description: "Solid fills and heavy lines.",
    plate: { weight: 1.5, fills: "solid", casings: true },
  },
];

export function isPlateFills(value: unknown): value is PlateFills {
  return value === "solid" || value === "outline";
}

export function clampPlateWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PLATE.weight;
  }
  const bounded = Math.min(MAX_PLATE_WEIGHT, Math.max(MIN_PLATE_WEIGHT, value));
  // One decimal, so the slider step and the permalink agree.
  return Math.round(bounded * 10) / 10;
}

export function getPlateOption(plateId: string): PlateOption | undefined {
  return plateOptions.find((option) => option.id === plateId);
}

/**
 * Returns the named plate that equals these rules, or null when the
 * user has moved a control away from every named plate.
 */
export function matchPlateId(plate: Plate): string | null {
  const match = plateOptions.find(
    (option) =>
      option.plate.weight === plate.weight &&
      option.plate.fills === plate.fills &&
      option.plate.casings === plate.casings,
  );
  return match ? match.id : null;
}
