import {
  DISPLAY_PALETTE_KEYS,
  type ThemeOption,
  type ThemeColorKey,
} from "../domain/types";

interface ThemeCardProps {
  themeOption: ThemeOption | null;
  onClick?: () => void;
  isSelected?: boolean;
  showFullPalette?: boolean;
}

export default function ThemeCard({
  themeOption,
  onClick,
  isSelected = false,
  showFullPalette = false,
}: ThemeCardProps) {
  if (!themeOption) {
    return null;
  }

  const majorPaletteKeys: ThemeColorKey[] = showFullPalette
    ? DISPLAY_PALETTE_KEYS
    : [
        "ui.text",
        "map.land",
        "map.roads.major",
        "map.roads.minor_high",
        "map.roads.minor_mid",
      ];
  const majorPaletteIndices = majorPaletteKeys
    .map((key) => DISPLAY_PALETTE_KEYS.indexOf(key))
    .filter((index) => index >= 0);
  const palette = (() => {
    if (!Array.isArray(themeOption.palette)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    const push = (color: string | undefined) => {
      if (color && !seen.has(color)) {
        seen.add(color);
        result.push(color);
      }
    };
    for (const index of majorPaletteIndices) {
      push(themeOption.palette[index]);
    }
    // A theme with one ink color for text and every road collapses to two
    // swatches. Its accent colors (the buildings triad) then fill the strip
    // and show the one thing that sets the theme apart.
    for (const color of themeOption.accentColors ?? []) {
      push(color);
    }
    return result;
  })();
  const className = ["theme-card", isSelected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={themeOption.name}
    >
      <div
        className={[
          "theme-card-palette",
          showFullPalette ? "theme-card-palette--full" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {palette.map((color, index) => (
          <span
            key={`${themeOption.id}-${color}-${index}`}
            className="theme-card-swatch"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <span className="theme-card-name-shadow" aria-hidden="true" />
      <p className="theme-card-name">{themeOption.name}</p>
    </button>
  );
}
