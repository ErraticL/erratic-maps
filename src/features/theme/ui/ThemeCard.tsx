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
    const accentColors = themeOption.accentColors ?? [];
    if (showFullPalette) {
      for (const index of majorPaletteIndices) push(themeOption.palette[index]);
      for (const color of accentColors) push(color);
      return result;
    }
    // The compact strip has five columns. For a theme with a buildings
    // triad, the triad is the thing that sets the theme apart, so text,
    // land and the three triad colors take the columns. The road tones
    // only fill columns that stay free. A theme without a triad keeps the
    // upstream strip: text, land and three road tones.
    const [textIndex, landIndex, ...roadIndices] = majorPaletteIndices;
    push(themeOption.palette[textIndex]);
    push(themeOption.palette[landIndex]);
    for (const color of accentColors) push(color);
    for (const index of roadIndices) push(themeOption.palette[index]);
    return result.slice(0, 5);
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
