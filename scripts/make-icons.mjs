// Generates the Erratic Maps icon set and the Open Graph banner from
// public/assets/logo.svg. Run from the repo root: node scripts/make-icons.mjs
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "public", "assets");
const logo = path.join(assets, "logo.svg");
const NAVY = "#0a1824";

async function boulderPng(size) {
  return sharp(logo).resize(size, size).png().toBuffer();
}

// Solid navy tile with the boulder centered at `scale` of the tile.
async function tile(size, scale, out) {
  const inner = Math.round(size * scale);
  const glyph = await boulderPng(inner);
  const off = Math.round((size - inner) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: glyph, left: off, top: off }])
    .png()
    .toFile(path.join(assets, out));
  console.log("wrote", out);
}

// Transparent favicon sizes straight from the SVG.
for (const size of [16, 32]) {
  await sharp(logo)
    .resize(size, size)
    .png()
    .toFile(path.join(assets, `favicon-${size}.png`));
  console.log(`wrote favicon-${size}.png`);
}

await tile(192, 0.78, "icon-192.png");
await tile(512, 0.78, "icon-512.png");
await tile(512, 0.55, "icon-maskable.png");
await tile(180, 0.72, "apple-touch-icon.png");

// Open Graph banner: navy gradient, boulder, wordmark.
const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#09121c"/>
      <stop offset="0.45" stop-color="#0d1a27"/>
      <stop offset="1" stop-color="#0a1824"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="400" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="86" font-weight="700" fill="#e6edf4">Erratic Maps</text>
  <text x="400" y="368" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#7fb4e6">Free map poster &amp; wallpaper creator</text>
  <text x="400" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#5d7a94">maps.erraticl.uk</text>
</svg>`;

const glyph = await boulderPng(300);
await sharp(Buffer.from(banner))
  .composite([{ input: glyph, left: 70, top: 165 }])
  .png()
  .toFile(path.join(assets, "banner.png"));
console.log("wrote banner.png");
