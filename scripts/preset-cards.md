# How to make the preset cards

Decision 20 of `docs/roadmap/editor.md`: the cards of the Presets
section show real renders, one export per preset, by hand. This file
is the record of the steps. A headless export script (Playwright)
becomes worth the work only beyond about fifteen presets.

The cards live in `public/assets/presets/<id>.webp`, 300 x 424 px,
where `<id>` is the `id` of the preset in `src/data/presets.json`.

## The fixed showcase place

Every card shows the same place, so a difference between two cards
comes from the preset and never from the map.

- Lisbon, Portugal
- `loc=38.722300,-9.139300`, `d=3500`
- Layout: A4 portrait (`print_a4_portrait`)

Lisbon carries a dense centre, a hard coastline and real terrain in one
frame, so the relief presets and the water presets have something to
show. Hanover is flat and Stuttgart has no large water; both were
compared as renders before the choice.

## The steps

1. Start the dev server (`npx vite`) and open the app.
2. Open the download dialog once and choose **150 DPI**. An A4 portrait
   then exports 1240 x 1754 px, which is enough for a 300 x 424 card
   and small enough to handle eleven times.
3. For each preset in `src/data/presets.json`, build the permalink of
   its values and put it in the address bar. The keys are the ones the
   codec writes: `theme`, `lw`, `fills`, `casings`, `cont`, `hs`,
   `mat`, `text`, `mask`, `off` and `c`. The fastest way to get a
   correct hash is to click the preset card in the app and copy the
   address bar, because the app writes the hash itself.
4. Wait until the map stops loading. A relief preset needs the terrain
   tiles as well.
5. Export a PNG. Save it as `<id>.png` in one directory, for example
   `cards/`.
6. Run the card script:

   ```
   node scripts/make-preset-cards.mjs cards
   ```

   It writes one `<id>.webp` per preset into `public/assets/presets/`.
   It stops with a message when a preset has no PNG.
7. Look at the cards at card size before the commit. The panel draws
   them at about 88 x 124 px on a desktop and about 108 x 153 px in
   the phone drawer. A card must stay recognizable at that size.

## After a change to the list

- A new preset needs its own card. The `<img>` shows the file name
  `<id>.webp`, so a card without a file leaves an empty box.
- A change to the values of a preset needs a new export of that
  preset. The card is a picture of the values, and a stale card lies.
- `combine-showcase-grid.mjs` builds a 3 x 2 contact sheet from full
  size exports. Use it to compare presets side by side before a
  decision; it does not make the cards.
