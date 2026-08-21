# Roadmap: an editor, not a generator

Decided on 2026-08-21 after a brainstorm, four real prototypes and a
grilling of fifteen decisions. This document is the record. A later
session implements it, one step per release.

**Status 2026-08-21.** All four steps are built, as releases 0.6.0,
0.7.0, 0.8.0 and 0.9.0. Release 0.7.1, the export resolution, is live
as well; its record is [resolution.md](resolution.md). Every desktop
gate passed. The phone checks of 0.6.0, 0.7.0, 0.7.1, 0.8.0 and 0.9.0
stay open, and only Marcel can run them. The four open questions of
step 4 are answered, and the answers sit in the block "Answers for
step 4" below. The decisions stay as they were decided; a *Built:*
note records what exists, and decision 17 carries the one reversal.

## The direction

Erratic Maps becomes an editor. Every visible property of the poster
becomes a control. Presets are starting points only. There is no
backend and no gallery; the permalink or the exported file is the way
to share a design.

Why: the fork claims a real divergence from Terraink. Before this
roadmap, the additions (themes, the building triad, the credits switch,
permalinks, the interface skin) sat around an unchanged poster. The
poster that every generator on the market produces is the same sheet:
the map fills the page, two gradient fades, the city name and the
coordinates at the bottom.

## Four dimensions

The poster has four independent dimensions. A preset is a named
combination of all four. After a preset is applied, every dimension
stays editable on its own.

| Dimension | Meaning | Section |
| --- | --- | --- |
| Theme | colors (exists) | Theme |
| Plate | how the map draws: line weight, fills, casings | Layers, sub-heading "Drawing" |
| Sheet | composition: mat, mask, text position | Layout, sub-heading "Composition" |
| Layers | content switches, including relief | Layers |

## Work order and releases

| Step | Release | Content | Status |
| --- | --- | --- | --- |
| 1 | 0.6 | Plate | Shipped 2026-08-21, both gates passed |
| 2 | 0.7 | Relief | Shipped 2026-08-21, both gates passed |
| - | 0.7.1 | Export resolution ([resolution.md](resolution.md)) | Shipped 2026-08-21, every desktop gate passed; the phone gate stays open |
| 3 | 0.8 | Sheet model, mat, text position, mask | Shipped 2026-08-21, the padding gate passed; the phone gate stays open |
| 4 | 0.9 | Presets, full permalink coverage | Shipped 2026-08-21, five desktop gates passed; the phone gate stays open |

Release 0.7.1 is not a step of this roadmap. It repairs the export
before step 3 rewrites the same files.

The order follows Marcel's ranking of the prototypes: line plate first,
relief second, sheet third. The default poster keeps today's look until
presets ship. Then the default preset equals today's look, so old links
and the startup stay the same.

Rule for every release: export PNG, PDF and SVG, on desktop and on a
phone, look at the files, then release. The `updates.json` entry and the
version bump ship together.

## Decisions

### Plate

1. A plate is drawing rules only. The Layers section keeps every
   content switch. A look such as "figure-ground" (buildings only) is a
   preset that combines a plate with a Layers state, not a plate.
2. Three controls in the first version: line weight (a scale from 0.5
   to 2), fills (solid or outline; applies to water, parks, landcover
   and buildings), casings (on or off). Named plates *Full*, *Line* and
   *Bold* set all three at once. Building mode (one tone or triad)
   stays with the theme, because a theme without triad colors cannot
   offer it.
   *Built:* the values are Full (1, solid, casings on), Line (1,
   outline, casings off) and Bold (1.5, solid, casings on). The
   default form takes Full, so the poster of 0.5 does not change.
3. Implementation: a transform that runs after `generateMapStyle`, in a
   new file. `generateMapStyle` has one call site,
   `src/features/poster/ui/PosterContext.tsx`. The upstream function
   stays close to upstream so merges stay cheap. The export map
   receives the transformed style object, so the export needs no
   change.
   *Built:* `src/features/map/domain/plate.ts` holds the type and the
   named plates; `src/features/map/infrastructure/plateTransform.ts`
   holds `applyPlate`. A `zoom` expression may sit only at the top
   level of a property value, so the transform scales the output stops
   of each width interpolation one by one.
4. The outline mode needs line layers on the polygon sources.
   `fill-outline-color` is a fixed one-pixel hairline and does not
   scale with the weight control.
   *Built:* the five outline layers always exist, and only their
   visibility changes. `MapPreview` updates a style in place and
   cannot add a layer; a `hasSameLayerIds` guard now forces a full
   `setStyle` if the id list ever differs. An outline takes the fill
   color blended 45 % towards the text color, because the plain fill
   color is invisible as a hairline.
5. The controls live in the Layers section under a "Drawing"
   sub-heading, with the three named plate cards on top. No nav
   change. The nav is restructured once, in the preset step.

### Permalink

6. The permalink carries every value that differs from the default.
   Starting with this step: the plate values and a compact list of the
   Layers switches that are off (for example `off=parks,rail`). Custom
   colors join in the preset step. Unknown keys are ignored by the
   existing parser, so old links keep working. The codec is
   `src/features/share/domain/permalink.ts`.
   *Built:* the keys are `lw`, `fills`, `casings` and `off`. For these
   keys a missing key means the default value, not "keep the value the
   app shows now", so a link restores the whole drawing.

### Relief

7. Data: terrarium DEM tiles direct from the AWS Open Data bucket,
   `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`,
   fetched by the visitor's browser. The URL sits in one constant. No
   SLA exists. The EU replica answers 403 to anonymous requests and is
   not an option. `public/_headers` sets no CSP, so no allowlist is
   needed. The privacy policy must list Amazon as a third party that
   receives the IP address and the tile coordinates.
8. Library: `maplibre-contour` (contours in a worker through
   `addProtocol`), hillshade as a native MapLibre layer. The prototype
   on 2026-08-21 rendered Stuttgart at the full 2893 x 4096 canvas in
   5.7 seconds on the main thread, with 161 contour features in view.
   *Built:* `src/features/map/infrastructure/reliefSource.ts` holds the
   URL, the lazy `DemSource` and the two source specifications;
   `reliefTransform.ts` holds `applyRelief`. The transform runs after
   `generateMapStyle` and before `applyPlate`, so the plate weight
   scales the contour lines with every other line of the map. The
   relief layers sit directly under the `building` layer.
9. Controls: two switches, one parameter each. "Contour lines" with an
   interval (Auto, 10, 20, 50, 100 m). "Hillshade" with a strength
   (Soft, Strong). Tones derive from the theme: contour lines take the
   text color at low opacity, the hillshade takes a tone blended from
   the land color. Relief is available for every theme and every sheet.
   *Built:* the interval picks the thresholds that `maplibre-contour`
   encodes in the source URL. The contour lines draw in two layers,
   minor and major, so a major line every fifth step reads heavier. The
   hillshade tones follow the luminance of the land color, so a dark
   theme keeps a dark shadow and a light highlight.
   *Open point answered:* the relief layers exist only while relief is
   on. `MapPreview` falls back to `setStyle`, and MapLibre applies that
   as a differential update: the base vector source object stays the
   same instance across a relief toggle, so the base map does not
   reload and no flash appears. Layers that are always present were the
   other option, but they would put a permanent terrain source in the
   style and start the contour worker for every visitor, including the
   ones who never turn relief on.
10. Credit: when relief is on and credits are on, the poster carries one
    short extra line, for example "Terrain: Tilezen terrain tiles
    (Copernicus EU-DEM, USGS SRTM and others)". The full attribution
    paragraph (twelve sources, see
    https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
    goes on the site, reachable from the footer. The credits switch
    hides this line too, and its hint names the terrain credit.
    *Built:* the poster line uses that exact text. The full list is
    `src/shared/ui/TerrainAttribution.tsx` inside the map attribution
    dialog; the required block of the Tilezen document holds eleven
    bullets, not twelve. The dialog now opens on a phone as well,
    because the footer button that opens it was hidden there.
11. Export phases: the export reports "Loading terrain", "Rendering
    map", "Building file", driven by real MapLibre events. No
    percentage. The phase text serves every export, not only relief.
12. Failure: a tile error on the export map aborts the export with a
    clear message ("Terrain data did not load. Try again, or turn relief
    off."). MapLibre treats a failed tile as loaded, so the export counts
    tile errors on the DEM, the contour and the base map sources and
    refuses to continue when any occurred. This also closes an upstream
    gap: a failed base map tile exports as a hole today.
    *Built:* the export races the idle event against the first tile
    error, so a dead tile server stops it at once instead of after the
    timeout. The download dialog stays open on a failure and shows the
    message; the error line of the settings panel is off screen at that
    moment.

### Sheet

13. The sheet model is a pure function in `poster/domain`: sheet size
    and sheet settings in, geometry out (map hole, mask, text block
    positions). The DOM preview, the canvas compositor and the SVG
    exporter all read it.
    *Built:* `src/features/poster/domain/sheet.ts` holds the `Sheet`
    type and `computeSheetGeometry`. The geometry carries the hole,
    the hole outline as ONE SVG path string, the MapLibre padding as
    fractions of the sheet, the center offset, the box of the text
    block and the height of each fade. Four consumers read it: the
    DOM overlay `SheetMat.tsx`, the padding of `MapPreview`, the
    canvas compositor and the layered SVG exporter. The DOM and the
    canvas fill the SAME path string, so the preview and the file
    cannot draw a different shape.
14. First version: a mat (0 to 20 % of the short side, in the theme
    background color), the text position (bottom, top, none), a mask
    (none, circle, arch, rounded). Caption lines and a frame line
    follow as a small later step.
    *Built:* one rule decides the hole, and it needed a decision that
    the plan did not carry. The mat insets all four edges by the same
    amount, and the edge that carries the text takes
    `max(mat, min(2 * mat, text block))`. The text block is a quarter
    of the poster height. That formula keeps the control continuous:
    at a mat of zero the poster is the poster of release 0.7.1, no
    edge jumps as the mat grows, and from a mat of about 19 % the
    text sits fully on the paper. The hole is therefore NOT symmetric
    while the text is on, which is what makes decision 15 real. The
    mask labels in the interface are Full, Rounded, Circle and
    Arch.
15. The map stays full-frame under the mat. The preview draws the mat
    as an overlay with a hole; the exports draw the full map and paint
    the mat around the hole. `map.setPadding` keeps the chosen location
    at the center of the hole; `getCenter()` still reports the
    location; the export map receives the same padding. The marker and
    route projection stays, plus one pixel offset for the padding. The
    overzoom and distance-to-zoom code stays untouched.
    *Built:* the MapLibre constructor takes no padding, so each export
    map calls `setPadding` right after it is built. The preview
    padding transfers with one scale factor per axis, because the
    export container has the size of the preview container.
    `MarkerProjectionInput` carries `centerOffsetX` and
    `centerOffsetY`, which are `(left - right) / 2` and
    `(top - bottom) / 2` of the padding; `projectMarkerToCanvas` adds
    them. This is exactly what MapLibre does in
    `EdgeInsets.getCenter`. The preview overlays needed no change,
    because they call `map.project`, which already answers in the
    padded frame. The mat draws AFTER the markers on the canvas and
    in the SVG, so a marker outside the hole is cut off with the
    map.
16. The controls live in the Layout section under a "Composition"
    sub-heading. The name "Layout" stays.
    *Built:* the block sits at the end of the layout part of
    `MapSettingsSection`, below the layout cards and below the custom
    size editor, so it shows in both states. One slider and two rows
    of pill buttons, in the visual language of the Drawing block.
    *One control moved here:* the Style section carried a "Poster
    text" switch, and "Text > None" duplicated it. The two did not even
    agree: the switch hid the text but kept its reserved band, so the
    map hole stayed small. The switch is gone, the `showPosterText`
    form field with it, and the text block of the sheet is now the one
    control. `drawPosterText` reads the box alone; a null box means no
    text. The value also joins the permalink, which `showPosterText`
    never did. Marcel chose this against keeping the switch.
17. Fades: the sheet model turns a gradient fade on only at an edge
    where a text block overlaps the map hole.
    **REVERSED on 2026-08-21, after Marcel saw the result.** The
    decision reads the fades as a legibility device for the text. They
    are not. They are the "Overlay layer" switch in the Style section,
    which is a style choice of the visitor. The rule took the top fade
    away from every poster and left that switch with almost nothing to
    do. The decision was built as written, and the defect only became
    visible in the running app.
    *Built instead:* the sheet decides the GEOMETRY of a fade, never
    its existence. A fade sits at the top and at the bottom edge of the
    map hole and reaches a quarter of the hole into it. The "Overlay
    layer" switch alone turns the pair on and off, exactly as it did in
    release 0.7.1.
    *One rule joins it:* a mask takes the fades away. The shape is the
    edge treatment, and a fade over a circle dissolves the top and the
    bottom of the disc. So Full carries the fades and Rounded, Circle
    and Arch do not. Marcel chose this against two other options.
    The text of the default poster keeps its exact positions: the
    divider measures 0.8749 of the poster height in the exported file,
    against 0.875 in release 0.7.1.

### Presets

18. A Presets section at the top of the accordion. Cards with a name
    and a picture. A click sets all four dimensions at once. The
    sections below show the current values. A curated JSON list of 8 to
    12 presets in the repo. The permalink stores the resulting values,
    not the preset name, so a link stays valid when a preset changes.
    *Built:* `src/features/presets/` holds the slice, and
    `src/data/presets.json` holds ELEVEN presets. A JSON entry names
    only the values that differ from the default poster, and
    `normalizePreset` fills in the rest; that is the rule the permalink
    codec already follows. The first entry is Classic, and it equals
    the poster of release 0.8.0 exactly. A preset sets four groups:
    the theme with its custom colors, the three plate fields, the three
    sheet fields, and the seven layer switches with the four relief
    fields. It touches nothing else, so the location, the poster size,
    the markers, the routes, the font, the "Overlay layer" switch and
    the "Poster credits" switch all survive a click.
    *One thing the plan did not carry:* the ACTIVE preset is a
    comparison, not a stored id. `matchPresetId` answers which preset
    equals the poster right now, in the manner of `matchPlateId` of the
    plate. No new state field exists, and a permalink that happens to
    hold the values of a preset marks that card as well.
19. A preset click discards current edits, so it asks for confirmation
    only when edits exist.
    *Built:* "edits exist" is `matchPresetId(...) === null`, so the
    question appears exactly while no card is active. A click on the
    active card does nothing at all. The dialog names the preset, says
    what goes away and what stays, and its cancel keeps every value.
20. Cards show real renders: one fixed showcase place, one export per
    preset by hand, committed as WebP at card size. A checklist in
    `scripts/` records the steps. A headless export script (Playwright)
    becomes worth it only beyond about fifteen presets.
    *Built:* `scripts/preset-cards.md` is the checklist and
    `scripts/make-preset-cards.mjs` turns one PNG per preset into
    `public/assets/presets/<id>.webp` at 300 x 424 px. The eleven cards
    take 272 kB together and the `<img>` loads them lazily. The panel
    draws a card at 88 x 124 px on a desktop and at 108 x 153 px in the
    phone drawer, so the file carries between 1.7 and 3.4 times the
    pixels it shows.

### Answers for step 4

Decisions 18 to 20 fixed the shape of the preset step. Four questions
stayed open, and Marcel answered all four on 2026-08-21, each one from
real renders and measured numbers.

1. **The list itself.** A session proposed twelve presets, applied each
   one with `location.hash`, exported a real PNG of each, and showed
   them as two 3 x 2 contact sheets from
   `scripts/combine-showcase-grid.mjs`. Marcel cut the list to ELEVEN.
   Two of the twelve were replaced before the cut: Contour was pale
   with outline fills and no buildings, and Shoreline was nearly empty
   with water and parks alone. The list is Classic, Blueprint, Figure
   Ground, Contour, Medallion, Arch, Neon, Frame, Shoreline, Ridge and
   Paper. Ink was dropped, because Paper carries the same idea and the
   `japanese_ink` water reads as land.
   *One finding from the renders:* every theme sets `ui.bg` equal to
   `map.land`, so a mat has the color of the land under it. A mat reads
   as a margin only where the map content reaches the edge, or where a
   mask cuts the shape. A preset that rests on the mat alone is a weak
   preset.
2. **Custom colors in the permalink.** The key is `c`. Its value is a
   base36 bitmask over the 16 `DISPLAY_PALETTE_KEYS`, padded to a fixed
   width, followed by the six hex digits of each marked color in key
   order, with NO separator. One color costs 13 characters with the
   key; all 16 cost 103. `URLSearchParams` percent-encodes every
   character except the letters, the digits and `* - . _`, so a
   separator would cost three characters each time; the app already
   writes `off=buildings%2Crail` for that reason. Two other forms were
   measured and rejected: index and hex pairs (151 characters, more
   readable) and base64url bytes (69 characters, unreadable).
   The codec is `src/features/theme/domain/colorCodec.ts`, which owns
   the key order. `permalink.ts` stays free of imports and treats the
   token as opaque; it only checks the alphabet.
3. **The nav.** Presets joins as the FIRST tab and the first accordion
   section, and nothing else moves. Eight tabs. The sections already
   carry the four dimensions after releases 0.6 to 0.8, so the whole
   restructure of decision 5 is one addition. The phone strip already
   scrolls today: at 375 px it shows 273 px of a 504 px strip, which is
   3.8 of the seven tabs. The eighth tab makes it 576 px and changes no
   interaction. Two other structures were offered and rejected: merge
   Markers and Routes into one tab, or fold Style into Layout.
4. **The showcase place.** LISBON, `loc=38.722300,-9.139300`,
   `d=3500`, A4 portrait. One plain preset and one relief preset were
   rendered at Hanover, Lisbon and Stuttgart before the choice. Hanover
   gives the best city card and no terrain at all, so the Contour and
   Ridge cards would carry no evidence there. Stuttgart gives the best
   terrain and the weakest city. Lisbon is the only one of the three
   that carries a dense centre, water and terrain in one frame. Its
   cost is the Tagus, which fills about a quarter of every card.

## Verification gates

Each item has a gate that runs before the work depends on it. A failed
gate stops the step and reopens the decision. Ten gates passed on
2026-08-21: two in step 1, two in step 2, the padding gate of step 3
and five in step 4. One gate remains, and it is the phone check of
Marcel.

Step 4 confirmed the three gates the block above suggested and added
two, because the release touches the default poster and the codec.

| Assumption | Gate |
| --- | --- |
| ~~Outline mode as line layers under the 5.5x overzoom~~ | **PASSED 2026-08-21.** Checked by eye at zoom 12, 14 and 16, on 1:1 crops of the render canvas. |
| ~~Layered SVG export with the extra layers~~ | **PASSED 2026-08-21.** One SVG per plate. Full and Bold hold the 23 layer groups of 0.5; Line holds 19, with the five outline groups and no casing groups. |
| ~~`maplibre-contour` bundled with its worker under Vite; the protocol reaches the offscreen export map~~ | **PASSED 2026-08-21.** The library inlines its worker as a blob URL, so Vite needs no worker configuration. A relief PNG at true A2 300 DPI (4961 x 7016 px) took 2.3 s from click to file: terrain at 0.1 s, file build at 1.3 s. The product capped an export at 8.5 megapixels then, so the caps were raised for the measurement only. The same export from the production build (`vite build` + `vite preview`) took 1.7 s at the cap of release 0.7. Release 0.7.1 removed that cap, and a relief PNG at true A2 300 DPI now takes 2.0 s in the product itself. |
| ~~Tile-error count on the export map~~ | **PASSED 2026-08-21.** A wrong terrain host aborts the export after 0.34 s with "Terrain data did not load. Try again, or turn relief off." A wrong base map host aborts with the base map message. MapLibre adds the `sourceId` of the failed source to its error event, which names the right message; a 404 fires no event, which is correct for a terrain tile outside the coverage. |
| ~~`setPadding` with the scaled container; the one-pixel offset for markers~~ | **PASSED 2026-08-21.** A circle marker on the Eiffel Tower, with a 15 % mat and the circle mask, on A4 at 300 DPI. The marker sits on the tower in the preview, in the PNG and in the SVG. Measured, not judged by eye alone: the DOM preview places the marker at 0.378779 of the width and 0.516081 of the height; the PNG (2480 x 3508) holds it at 939.4 / 1810.4 against the same numbers predicted, and the SVG (2451 x 3467) at 927.7 / 1788.6 against 928.4 / 1789.3 predicted. Both files agree with the preview inside 0.8 px. |
| ~~A preset click sets all four dimensions, and the permalink restores exactly those values in a fresh tab~~ | **PASSED 2026-08-21.** A click on Blueprint wrote `theme=blueprint&lw=0.9&fills=outline&casings=0&mat=6` and marked that card. A fresh tab loaded with a hash of all four dimensions plus a color token restored it byte for byte: the same hash came back, the water drew `#ff0000` from the token, the contour and hillshade layers existed, the buildings were hidden and the centre sat on the requested coordinates. |
| ~~A preset click on a poster with edits asks first, and a cancel keeps every edit~~ | **PASSED 2026-08-21.** With `mat=7`, which equals no preset, no card was active and a click on Medallion opened the dialog. The cancel left the hash at `mat=7` with every other value untouched. The confirm applied Medallion and marked its card. A click on the ACTIVE card does nothing and asks nothing. |
| ~~One exported card per preset reads at card size~~ | **PASSED 2026-08-21.** The eleven WebP cards were compared at their true drawn size of 88 x 124 px. Each one is recognizable by tone, density and shape; the circle of Medallion, the arch of Arch and the top text of Frame all read. Frame and Paper read mostly by tone, because both are low in contrast. |
| ~~The default preset equals today's poster~~ | **PASSED 2026-08-21.** The startup poster exported at 150 DPI, then Paper was applied, then Classic, then the poster exported again. The two PNG files are 4 922 210 bytes each with the same SHA-256, so they are identical byte for byte. |
| ~~All 16 custom colors survive a link~~ | **PASSED 2026-08-21.** A hash with all 16 colors, a custom plate, relief, a 20 % mat, a circle mask and five layers off measures 335 characters and restores every value on a fresh load. Water read `#0000ff` (key 4) and rail `#aa00aa` (key 9), so the mask maps to the right keys. The startup location dialog stayed closed, because the link answers the location. |
| Phone behavior | Marcel checks on the live site after each release; the browser pane cannot open the mobile drawer |

## Rejected during the brainstorm

- Boulder or glacier themed features (an erratics layer, ice-margin
  lines, a boulder gallery). The name is a metaphor for distance from
  the origin, not a subject.
- A backend or a public gallery.
- A "journey poster" with two places on one map. The style is tuned for
  zoom 11 to 17 and draws almost nothing at country scale.
- Paper grain or risograph texture. Cosmetic, PNG only, fights the SVG
  export.
- Schematic mockups as a decision aid. Marcel needs real renders.

## Method note

The four prototypes were built inside the running app with a temporary
`window.__erraticMap` hook in `MapPreview.tsx` (reverted, never
committed), a canvas overlay, the real compositor, a style transform and
`maplibre-contour` from a CDN. Step 1 used the same hook again to hold
the map at exactly zoom 12, 14 and 16 for its gate. Step 2 used it to
read `map.getStyle()` and to prove that a relief toggle keeps the base
source object. Both steps removed the hook before the commit. The
permalink applies live on
`hashchange`, so `location.hash = "#loc=..."` moves the map without a
reload. This is the fastest way to show Marcel a real result before a
decision.
