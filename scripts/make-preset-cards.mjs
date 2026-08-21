/**
 * Builds the preset cards of the Presets section.
 *
 * It takes one real poster export per preset and writes the small WebP
 * that the card shows. `combine-showcase-grid.mjs` makes the contact
 * sheet for a review; this script makes the individual pictures,
 * because a card needs a resize and a WebP encode that the grid script
 * does not do.
 *
 * Usage:
 *   node scripts/make-preset-cards.mjs <source-directory>
 *
 * The source directory holds one PNG per preset, named after the id in
 * src/data/presets.json, for example `blueprint.png`. The steps that
 * produce those PNGs are in scripts/preset-cards.md.
 */

import { readdir, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const projectRoot = process.cwd();
const sourceDir = process.argv[2];
const outputDir = path.join(projectRoot, "public", "assets", "presets");
// The card is 300 x 424, which is A4 portrait at twice the size the
// panel draws it. The <img> in PresetsSection.tsx names the same pair.
const cardWidth = 300;
const cardHeight = 424;
const webpQuality = 82;

async function readPresetIds() {
  const manifestPath = path.join(projectRoot, "src", "data", "presets.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return manifest.presets.map((preset) => preset.id);
}

async function main() {
  if (!sourceDir) {
    throw new Error("Name the source directory of the poster exports.");
  }

  const ids = await readPresetIds();
  const files = new Set(await readdir(sourceDir));
  await mkdir(outputDir, { recursive: true });

  const missing = [];
  for (const id of ids) {
    const fileName = `${id}.png`;
    if (!files.has(fileName)) {
      missing.push(fileName);
      continue;
    }

    const outputPath = path.join(outputDir, `${id}.webp`);
    const info = await sharp(path.join(sourceDir, fileName))
      .resize(cardWidth, cardHeight, { fit: "cover" })
      .webp({ quality: webpQuality })
      .toFile(outputPath);

    console.log(`${id}.webp ${info.width}x${info.height} ${info.size} bytes`);
  }

  if (missing.length > 0) {
    throw new Error(`No export for: ${missing.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
