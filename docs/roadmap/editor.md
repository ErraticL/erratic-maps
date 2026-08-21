# Roadmap: an editor, not a generator

Decided on 2026-08-21 after a brainstorm, four real prototypes and a
grilling of fifteen decisions. This document is the record. A later
session implements it, one step per release.

**Status 2026-08-21: step 1 (the plate) shipped as 0.6.0 and step 2
(relief) as 0.7.0. Both are live. Release 0.7.1, the export
resolution, is built and waits for a push; its own record is
[resolution.md](resolution.md).** Steps 3 and 4 wait. The decisions
below stay as they were decided; the status notes only record what
exists.

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
| - | 0.7.1 | Export resolution ([resolution.md](resolution.md)) | Built 2026-08-21, waits for a push; every desktop gate passed |
| 3 | 0.8 | Sheet model, mat, text position, mask | Waits |
| 4 | 0.9 | Presets, full permalink coverage | Waits |

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
14. First version: a mat (0 to 20 % of the short side, in the theme
    background color), the text position (bottom, top, none), a mask
    (none, circle, arch, rounded). Caption lines and a frame line
    follow as a small later step.
15. The map stays full-frame under the mat. The preview draws the mat
    as an overlay with a hole; the exports draw the full map and paint
    the mat around the hole. `map.setPadding` keeps the chosen location
    at the center of the hole; `getCenter()` still reports the
    location; the export map receives the same padding. The marker and
    route projection stays, plus one pixel offset for the padding. The
    overzoom and distance-to-zoom code stays untouched.
16. The controls live in the Layout section under a "Composition"
    sub-heading. The name "Layout" stays.
17. Fades: the sheet model turns a gradient fade on only at an edge
    where a text block overlaps the map hole.

### Presets

18. A Presets section at the top of the accordion. Cards with a name
    and a picture. A click sets all four dimensions at once. The
    sections below show the current values. A curated JSON list of 8 to
    12 presets in the repo. The permalink stores the resulting values,
    not the preset name, so a link stays valid when a preset changes.
19. A preset click discards current edits, so it asks for confirmation
    only when edits exist.
20. Cards show real renders: one fixed showcase place, one export per
    preset by hand, committed as WebP at card size. A checklist in
    `scripts/` records the steps. A headless export script (Playwright)
    becomes worth it only beyond about fifteen presets.

## Verification gates

Each item has a gate that runs before the work depends on it. A failed
gate stops the step and reopens the decision. Four gates passed on
2026-08-21, two in step 1 and two in step 2. Two gates remain, and both
belong to step 3.

| Assumption | Gate |
| --- | --- |
| ~~Outline mode as line layers under the 5.5x overzoom~~ | **PASSED 2026-08-21.** Checked by eye at zoom 12, 14 and 16, on 1:1 crops of the render canvas. |
| ~~Layered SVG export with the extra layers~~ | **PASSED 2026-08-21.** One SVG per plate. Full and Bold hold the 23 layer groups of 0.5; Line holds 19, with the five outline groups and no casing groups. |
| ~~`maplibre-contour` bundled with its worker under Vite; the protocol reaches the offscreen export map~~ | **PASSED 2026-08-21.** The library inlines its worker as a blob URL, so Vite needs no worker configuration. A relief PNG at true A2 300 DPI (4961 x 7016 px) took 2.3 s from click to file: terrain at 0.1 s, file build at 1.3 s. The product capped an export at 8.5 megapixels then, so the caps were raised for the measurement only. The same export from the production build (`vite build` + `vite preview`) took 1.7 s at the cap of release 0.7. Release 0.7.1 removed that cap, and a relief PNG at true A2 300 DPI now takes 2.0 s in the product itself. |
| ~~Tile-error count on the export map~~ | **PASSED 2026-08-21.** A wrong terrain host aborts the export after 0.34 s with "Terrain data did not load. Try again, or turn relief off." A wrong base map host aborts with the base map message. MapLibre adds the `sourceId` of the failed source to its error event, which names the right message; a 404 fires no event, which is correct for a terrain tile outside the coverage. |
| `setPadding` with the scaled container; the one-pixel offset for markers | A marker on a landmark sits on it in preview, PNG and SVG, with a mat and with a circle |
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
