# Plan: export resolution, release 0.7.1

Decided on 2026-08-21 after a measurement session and a grilling. This
step sits between 0.7 (relief) and 0.8 (sheet model) in
[editor.md](editor.md).

**Status 2026-08-21: BUILT as release 0.7.1. Every gate passed on the
desktop; the phone gate belongs to Marcel.** The decisions below stay
as they were decided. A *Built:* note records what exists, and the gate
table at the end carries the measured results. The section "The
problem" describes release 0.7, not the app of today.

## The problem

Every export was scaled down to 8.5 megapixels and 4096 px per side.
The constants are `MAX_PIXELS` and `MAX_SIDE` in
`src/features/poster/infrastructure/renderer/constants.ts`;
`resolveCanvasSize` in `canvas.ts` applies them. A third cap hides in
MapLibre: both export maps (`mapExporter.ts`, `layeredSvgExporter.ts`)
use the default `maxCanvasSize` of 4096 x 4096, so MapLibre lowers the
pixel ratio until the GL canvas fits. Raising the two constants alone
changes nothing; the GL canvas stops at 4096 and the 2D canvas upscales
it.

Effective output at 300 DPI today:

| Size | Needed | Exported | Effective DPI |
| --- | --- | --- | --- |
| A4 | 2480 x 3508 | 2450 x 3466 | 296 |
| A3 | 3508 x 4961 | 2450 x 3466 | 210 |
| A2 | 4961 x 7016 | 2450 x 3466 | 148 |
| A1 | 7016 x 9933 | 2450 x 3466 | 105 |

A related defect: `useExport.ts` writes a fixed 300 DPI into the PNG
`pHYs` chunk. A scaled-down A3 file claims 300 DPI and opens at
20.7 x 29.3 cm in a print shop. The PDF keeps the right page size with
a low-resolution image.

## Measured on 2026-08-21

Reproduced inside the running app: same zoom, same tiles, the export
container geometry of `resolveExportRenderParams`, `maxCanvasSize`
raised to 16384. Desktop, Chrome, AMD RX 6800 XT, 32 GB. No code change.

| Size at 300 DPI | GL canvas | Render | PNG encode | PNG file |
| --- | --- | --- | --- | --- |
| A4 | 2480 x 3509 | 0.40 s | 0.37 s | 13.5 MB |
| A3 | 3508 x 4964 | 0.33 s | 0.63 s | 22.2 MB |
| A2 | 4961 x 7020 | 0.52 s | 1.09 s | 35.4 MB |
| A1 | 7018 x 9933 | 0.36 s | 1.85 s | 55.7 MB |
| A0 | 9933 x 14057 | 0.35 s | 3.27 s | 85.4 MB |

The render time is flat because the tile zoom does not change with the
pixel ratio. A pixel sample of the A2 render held 397 color buckets and
no transparent pixels; a 1:1 crop showed crisp lines.

Device facts that set the ceiling: WebGL `MAX_RENDERBUFFER_SIZE` (16384
on this desktop; 4096 to 8192 on phones), `navigator.deviceMemory`, and
the canvas memory: an A1 export holds three full-size buffers at once
(GL canvas, captured canvas, composited canvas), about 280 MB each.

## Decisions

Grilled on 2026-08-21, eight questions, each answered by Marcel.

1. **Shape.** A DPI picker for print layouts: Standard (today's cap),
   150, 200, 300 DPI. Pixel layouts (social, wallpaper, web) export at
   their named pixel size, with a 2x option for high-density screens.
   Today a "4K" wallpaper maps to a 30 cm poster and exports at
   3543 x 1993; this step corrects that. A readout under the picker
   shows the result: "A2 - 4961 x 7016 px - about 35 MB".
   *Built:* `printTiers` and `pixelTiers` in
   `src/features/export/domain/resolution.ts`. The two pixel tiers are
   "Named size" and "2x". The readout comes from
   `formatResolutionReadout`, and its file size is an estimate of
   3.28 MB x megapixels^0.67, fitted to the measured table above. The
   estimate holds inside 10 % up to A2 and reads 27 % high at 200
   megapixels, so the readout says "about".
2. **Default.** 300 DPI where the device budget allows it, Standard
   elsewhere. Pixel layouts default to their named size in every case.
   *Built:* `defaultTier` in
   `src/features/export/application/useExportResolution.ts`. A stored
   choice that the current poster cannot reach falls back to the
   default and does not overwrite the stored value.
3. **Device ceiling.** Per-side limit from WebGL `MAX_RENDERBUFFER_SIZE`
   (16384 on Marcel's desktop, 4096 to 8192 on phones). Pixel budget
   from `navigator.deviceMemory`: 8 GB or more gives 140 Mpx (A0),
   4 GB gives 35 Mpx (A2), unknown on a desktop gives 35 Mpx, a phone
   or 2 GB or less gives Standard. `deviceMemory` exists in Chrome and
   Edge only. The budget limits the default only. The picker goes up to
   the WebGL limit; every option above the budget carries the words
   "may fail on this device". No live probe: it costs the same memory
   as the export and proves little.
   *Built:* `src/features/export/infrastructure/deviceCeiling.ts`. It
   takes the SMALLER of `MAX_RENDERBUFFER_SIZE` and `MAX_TEXTURE_SIZE`,
   because a canvas needs both, clamps the result to 4096 to 16384, and
   drops the probe context again. A handheld is
   `(pointer: coarse) and (hover: none)`, which covers a tablet as
   well. `navigator.deviceMemory` caps at 8 even on a 32 GB machine, so
   8 GB is the top step and not a measurement.
4. **Failure.** A null `toBlob`, a failed canvas allocation or a lost
   WebGL context aborts the export with the message "This resolution
   did not fit in memory on this device. Choose a lower one." The
   dialog stays open. No retry at a lower tier: the visitor never
   receives a file that differs from the readout. This is the rule the
   relief export already follows. A tab crash from a device that
   misreports its memory is not catchable; no option removes it.
   *Built:* `createExportCanvas` and `trackContextLoss` in
   `exportUtils.ts`, the null `toBlob` in `pngExporter.ts`, an empty
   JPEG data URL in `pdfExporter.ts`, and the size check in the
   compositor. All four throw the same message. `createExportCanvas`
   compares the size the canvas reports against the size it asked for,
   because a browser that cannot allocate the pixels keeps the old size
   instead of raising an error.
5. **SVG.** The layered SVG export stays at Standard. It renders one
   raster per layer, about 25 of them; at A2 that is 25 to 40 s and an
   estimated 80 to 130 MB file. The picker shows "SVG exports at
   standard resolution" when SVG is selected. A vector export is a
   different project.
   *Built:* the SVG path forces the base tier and the standard limits,
   so it exports 2452 x 3467 even while the picker sits at 300 DPI.
   The dialog has no "selected format": the visitor picks the format by
   clicking it. The note therefore appears while a tier above Standard
   is chosen, where it carries new information. Measured at A2 on the
   desktop: 27.4 s and a 46 MB file, inside the estimate.
6. **PDF.** Keeps the JPEG at quality 0.94, now with the full image
   and the page size from the centimeters as today. A lossless Flate
   stream is a follow-up if a print ever shows ringing.
   *Built:* unchanged, and the gate below measured it.
7. **Home and persistence.** The picker sits in the download dialog.
   The value persists in localStorage, per device. It stays out of the
   permalink, because it is a property of the device, not of the
   design. The Layout section shows the readout as one read-only line
   under the size fields.
   *Built:* `PosterState.exportResolution` holds the value, NOT
   `PosterForm`, so the permalink codec cannot pick it up. It holds one
   tier per layout kind, so a trip from a poster to a wallpaper and
   back keeps both answers. The store is the NEW `localSettingsStore`
   in `core/cache`: the same code as `localStorageCache` with an
   UNVERSIONED prefix, because the versioned prefix drops every value
   on each release and this value must survive one.
8. **Release.** 0.7.1, before the sheet model (0.8), because 0.8
   rewrites the same export files and each change deserves its own
   verification on the live site. The PNG `pHYs` chunk carries the real
   DPI (pixels divided by inches) in every tier. Both export maps
   receive `maxCanvasSize` from the setting. The label of today's cap
   is "Standard".
   *Built:* six commits, 503fe66 to 7133f16. One prerequisite was not
   in this plan and became its own commit (efedf82): `MAX_POSTER_CM`
   went from 45 to 120. A2 is 42 x 59.4 cm, so the old limit made the
   first gate below impossible and left the print tiers with no size
   above A3 to work on. A0 (84.1 x 118.9 cm) fits now. The export caps
   the pixels through the tier and the device ceiling, so the paper
   size needs no low limit of its own.

## Changes

All seven are done. Item 8 was not in the plan and joined the release:
the poster size limit rose from 45 cm to 120 cm, see decision 8.

1. Both export maps receive `maxCanvasSize` from the resolution setting.
2. `resolveCanvasSize` reads the cap from the setting instead of the two
   constants. The standard tier keeps today's values.
3. The PNG `pHYs` chunk carries the real DPI: pixels divided by inches.
4. A device ceiling sets the default to what the device can hold and
   marks the picker options above the budget. A failed canvas, a null
   `toBlob` or a lost WebGL context aborts the export with a message;
   the dialog stays open.
5. The SVG export keeps the standard cap, because it embeds one raster
   per layer.
6. The download dialog gets the resolution control; the value persists
   in localStorage and stays out of the permalink.
7. Release 0.7.1: version bump, `updates.json` entry, README line.

## Verification gates

Run on 2026-08-21 on the desktop, in Chrome, on an AMD RX 6800 XT with
32 GB. Every file came from the real export path and was measured from
its own bytes. One gate remains, and it is Marcel's.

| Assumption | Gate |
| --- | --- |
| ~~The real export path (offscreen map with the app's pixel ratio logic, compositor, `toBlob`) produces the measured sizes~~ | **PASSED.** A4 2480 x 3508 px (15.6 MB), A3 3508 x 4961 px (24.8 MB), A2 4961 x 7016 px (38.6 MB). The `pHYs` chunk of each file reports 300.0 DPI. A 1:1 crop of the A2 center holds sharp building edges and clean road casings, with no sign of an upscale. |
| ~~The PDF embeds the full image and keeps the page size~~ | **PASSED.** The A2 PDF has a MediaBox of 1190.551 x 1683.78 pt, which is 42.0 x 59.4 cm, and one DCTDecode image of 4961 x 7016 px, 12.5 MB. A crop of that image matches the PNG. |
| The device ceiling works on a phone | Marcel exports A3 on a phone; the app must either deliver or fall back with the message, never crash the tab |
| ~~Markers and routes keep their position at the new pixel ratio~~ | **PASSED.** A marker on the Eiffel Tower, moved off the center by a pan, sits on the tower in the A2 PNG. The icon centers on its coordinate, and the tower footprint sits inside the head of the pin. |
| ~~Relief at A2~~ | **PASSED.** A relief PNG at A2 took 2.0 s from click to file, far inside the 45 s timeout, at 4961 x 7016 px. Measured twice, Hanover and Stuttgart. |
| ~~Pixel layouts reach their named size~~ | **PASSED.** The 4K wallpaper measures 3840 x 2160 px, and 2x measures 7680 x 4320 px. Release 0.7 exported 3543 x 1993 px for the same layout. |
| ~~The readout matches the file~~ | **PASSED.** A4, A3, A2, the 4K wallpaper and its 2x option: the pixel size in the readout equals the pixel size of the file in every case. |

Four checks outside the table, all passed:

- The layered SVG at A2 exports 2452 x 3467 px while the picker sits at
  300 DPI, in 27.4 s and 46 MB. Decision 5 holds.
- A forced null `toBlob` stops the export with the message of decision
  4, and the dialog stays open with it.
- An emulated mobile viewport defaults to Standard, and 300 DPI carries
  the warning. This is the handheld branch of decision 3; it does not
  replace the phone gate above.
- A 200-megapixel export (14173 x 14173 px, a 120 x 120 cm poster at
  300 DPI) succeeds on this desktop in 4.4 s and writes a 90 MB file.
  The device is stronger than the plan assumed.

