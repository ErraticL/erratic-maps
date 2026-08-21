# Plan: export resolution, release 0.7.1

Decided on 2026-08-21 after a measurement session and a grilling. This
step sits between 0.7 (relief) and 0.8 (sheet model) in
[editor.md](editor.md).

## The problem

Every export is scaled down to 8.5 megapixels and 4096 px per side.
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
2. **Default.** 300 DPI where the device budget allows it, Standard
   elsewhere. Pixel layouts default to their named size in every case.
3. **Device ceiling.** Per-side limit from WebGL `MAX_RENDERBUFFER_SIZE`
   (16384 on Marcel's desktop, 4096 to 8192 on phones). Pixel budget
   from `navigator.deviceMemory`: 8 GB or more gives 140 Mpx (A0),
   4 GB gives 35 Mpx (A2), unknown on a desktop gives 35 Mpx, a phone
   or 2 GB or less gives Standard. `deviceMemory` exists in Chrome and
   Edge only. The budget limits the default only. The picker goes up to
   the WebGL limit; every option above the budget carries the words
   "may fail on this device". No live probe: it costs the same memory
   as the export and proves little.
4. **Failure.** A null `toBlob`, a failed canvas allocation or a lost
   WebGL context aborts the export with the message "This resolution
   did not fit in memory on this device. Choose a lower one." The
   dialog stays open. No retry at a lower tier: the visitor never
   receives a file that differs from the readout. This is the rule the
   relief export already follows. A tab crash from a device that
   misreports its memory is not catchable; no option removes it.
5. **SVG.** The layered SVG export stays at Standard. It renders one
   raster per layer, about 25 of them; at A2 that is 25 to 40 s and an
   estimated 80 to 130 MB file. The picker shows "SVG exports at
   standard resolution" when SVG is selected. A vector export is a
   different project.
6. **PDF.** Keeps the JPEG at quality 0.94, now with the full image
   and the page size from the centimeters as today. A lossless Flate
   stream is a follow-up if a print ever shows ringing.
7. **Home and persistence.** The picker sits in the download dialog.
   The value persists in localStorage, per device. It stays out of the
   permalink, because it is a property of the device, not of the
   design. The Layout section shows the readout as one read-only line
   under the size fields.
8. **Release.** 0.7.1, before the sheet model (0.8), because 0.8
   rewrites the same export files and each change deserves its own
   verification on the live site. The PNG `pHYs` chunk carries the real
   DPI (pixels divided by inches) in every tier. Both export maps
   receive `maxCanvasSize` from the setting. The label of today's cap
   is "Standard".

## Changes

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

| Assumption | Gate |
| --- | --- |
| The real export path (offscreen map with the app's pixel ratio logic, compositor, `toBlob`) produces the measured sizes | PNG exports at A4, A3, A2 at 300 DPI, opened, pixel size and DPI checked in an image viewer |
| The PDF embeds the full image and keeps the page size | A2 PDF opened, page size and zoomed detail checked |
| The device ceiling works on a phone | Marcel exports A3 on a phone; the app must either deliver or fall back with the message, never crash the tab |
| Markers and routes keep their position at the new pixel ratio | A marker on a landmark in an A2 PNG |
| Relief at A2 | One relief PNG at A2 inside the 45 s timeout |
| Pixel layouts reach their named size | A 4K wallpaper PNG measures 3840 x 2160; the 2x option measures 7680 x 4320 |
| The readout matches the file | The pixel size in the readout equals the pixel size of the exported file for A4, A2 and the 4K wallpaper |

