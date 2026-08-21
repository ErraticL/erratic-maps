![](./public/assets/banner.png)

# Erratic Maps

Erratic Maps is a free, browser-based map poster and wallpaper creator,
deployed at [maps.erraticl.uk](https://maps.erraticl.uk).

It is a fork of [Terraink](https://github.com/yousifamanuel/terraink) by
Yousuf Amanuel, rebranded and extended. An "erratic" is a boulder that a
glacier carried far from its origin — this project is that boulder.

## What Erratic Maps adds

- **Presets**: eleven named starting points in the first section of the
  panel. One click sets the theme, the plate, the sheet and the layers
  at once, and every control stays editable afterwards. Each card shows
  a real export of that preset at one fixed place, Lisbon, so the
  picture is the poster and not a drawing of it. A click asks first
  while the poster carries changes.
- The **plate**: three controls that change how the map draws, not
  what it shows. A line weight from 0.5x to 2x, solid or outline
  fills for water, parks, landcover and buildings, and a switch for
  the road casings. The named plates *Full*, *Line* and *Bold* set
  all three at once. They live in the Layers section under
  "Drawing".
- **Relief**: contour lines with an interval (Auto, 10, 20, 50 or
  100 m) and a hillshade with a strength (Soft or Strong), both in
  the Layers section. The tones follow the theme, so relief works
  with every theme. The elevation data are Tilezen terrain tiles,
  which your browser loads from Amazon Web Services while a relief
  switch is on. The full credit sits in the map attribution dialog,
  behind the ⓘ button in the footer.
- The **sheet**: three controls in the Layout section under
  "Composition" that decide how the poster sits on the paper. A mat
  from 0 to 20 % of the short side, in the background color of the
  theme; the text block at the bottom, at the top or nowhere; and a
  shape for the map (Full, Rounded, Circle or Arch). The map keeps
  the chosen location at the center of the hole. The gradient fades
  of the "Overlay layer" switch follow the hole; a shape turns them
  off, because the shape is the edge treatment.
- **Export resolution**: the download dialog chooses how many pixels
  an export holds. A print poster takes 150, 200 or 300 DPI; a
  wallpaper, a social post or a web image takes its named pixel size
  or twice that size. A readout names the result before the export,
  and the PNG carries its real resolution in the file.
- A **building height triad**: a theme can color buildings in three
  tones by rendered height (low, mid, tall) instead of one blended
  color.
- **Ten triad themes**: Classic and Candy (ported from the retired
  hand-built predecessor app), Catppuccin Mocha, Nord, Dracula,
  Gruvbox and Tokyo Night (after the MIT-licensed editor palettes of
  the same names), and the originals Iris, Glacier and Bauhaus.
- **Permalinks**: the URL hash always encodes location, distance,
  theme, layout, the poster names, the plate values, the relief
  values, the sheet values, the colors you changed and the layers that
  are off, so the address bar is a
  shareable link that restores
  the poster and skips the startup dialog. A key appears only when
  its value differs from the default.
- A **poster credits switch**: the Style section can remove the
  credit lines from the poster. The site keeps its attribution in the
  footer. If you publish a poster without the credit line, add
  "© OpenStreetMap contributors" next to it.
- A **gold-on-slate interface** with flat panels. Every color is a
  token in `src/styles/base.css`.

![Hanover in the Classic theme with height-triad buildings](./docs/images/showcase-classic-hanover.png)

The poster above is Hanover in the Classic theme: yellow buildings are
low, orange buildings are mid-rise, red buildings are tall.

## Features (from upstream)

- **Custom city map posters** for any location in the world, powered by real OpenStreetMap data
- **Smart geocoding** — search for any city or region by name, or enter coordinates manually
- **Rich theme system** — choose from dozens of curated themes or build your own custom color palette
- **Detailed map layers** — roads, water bodies, parks, and building footprints with per-layer styling
- **Typography controls** — set city/country display labels, and choose the typeface: the default Space Grotesk or one of nine self-hosted families. No font request leaves the site.
- **Markers and routes** — place markers on the map with your own icons, and draw a route from a GPX file
- **High-resolution export** — download a print-ready poster as PNG, PDF, or layered SVG at any defined dimension

## Run

```bash
npm install
npx vite
```

Upstream uses Bun (`bun install`, `bun run dev`); both work — this is a
plain Vite app.

## Build

```bash
npx vite build
```

## Environment

Check [`.env.example`](./.env.example) for available variables. All are
optional. `VITE_APP_CREDIT_URL` sets the on-poster credit line.

## License

This project stays under [AGPL-3.0](LICENSE), as required by the
upstream license. Upstream code released before April 3rd 2026 remains
under the [MIT License](LICENSE-OLD). If you deploy or modify this
code, you are responsible for complying with AGPL-3.0, including
preserving license and copyright notices.

## Trademark

Terraink™ is a trademark of Yousuf Amanuel. This fork does not use the
Terraink name or logo as its brand. The in-app footer carries the
credit "Based on Terraink source code". See
[TRADEMARK.md](./TRADEMARK.md) for the upstream trademark policy.

The Erratic Maps name and the pin-and-boulder mark are not affiliated
with Terraink.

## Attribution

- **Upstream source**: [Terraink](https://github.com/yousifamanuel/terraink) © Yousuf Amanuel, AGPL-3.0
- **Map data**: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL](https://opendatacommons.org/licenses/odbl/)
- **Tile schema**: © [OpenMapTiles](https://openmaptiles.org/), licensed under [ODbL](https://openmaptiles.org/docs/tileset/openmaptiles/)
- **Tile hosting**: [OpenFreeMap](https://openfreemap.org/)
- **Geocoding**: [Nominatim](https://nominatim.openstreetmap.org/) / OpenStreetMap data
- **Map renderer**: [MapLibre GL JS](https://maplibre.org/), licensed under [BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)

## Contributing

This fork tracks upstream through deliberate merges. Feature ideas that
are not Erratic-specific belong upstream — read the upstream
[CONTRIBUTING.md](./CONTRIBUTING.md) and contribute there.
