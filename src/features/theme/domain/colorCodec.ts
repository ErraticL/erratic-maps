/**
 * The compact form of the custom colors, for the `c` key of a
 * permalink.
 *
 * A poster can override all 16 palette keys. The plain paths
 * ("map.roads.minor_high") would make a hash of several hundred
 * characters, so the token names the keys by position instead:
 *
 *   c=003ke9724c
 *     ^^^^ a base36 bitmask over DISPLAY_PALETTE_KEYS, always 4 digits
 *         ^^^^^^ the six hex digits of each key that the mask marks,
 *                in the order of the key list
 *
 * One color costs 13 characters with the key, all 16 cost 103. The
 * token carries no separator, because `URLSearchParams` percent-encodes
 * every character except the letters, the digits and `* - . _`. A
 * separator would therefore cost three characters and read as noise.
 *
 * This module owns the key ORDER as well. Every other module reads the
 * order from DISPLAY_PALETTE_KEYS, so one list decides both sides.
 */

import { DISPLAY_PALETTE_KEYS } from "./types";

/**
 * The number of base36 digits the mask always takes. It follows the
 * length of the key list, so one more palette key cannot silently
 * overflow the field. Sixteen keys give four digits.
 */
const MASK_LENGTH = Math.max(
  1,
  Math.ceil(
    (DISPLAY_PALETTE_KEYS.length * Math.LN2) / Math.log(36),
  ),
);
const HEX_LENGTH = 6;

const hexPattern = /^[0-9a-f]{6}$/;
const tokenPattern = /^[0-9a-z]+$/;

/**
 * Builds the compact token. Returns an empty string while no key
 * carries an override, so the caller can leave the key out.
 */
export function encodeCustomColors(colors: Record<string, string>): string {
  let mask = 0;
  const values: string[] = [];

  DISPLAY_PALETTE_KEYS.forEach((key, index) => {
    const raw = String(colors[key] ?? "").trim().replace(/^#/, "").toLowerCase();
    if (!hexPattern.test(raw)) return;
    mask |= 1 << index;
    values.push(raw);
  });

  if (mask === 0) return "";
  return mask.toString(36).padStart(MASK_LENGTH, "0") + values.join("");
}

/**
 * Reads the compact token. Every failure returns an empty map, which
 * follows the rule of the codec: a missing or broken key means the
 * default, and the default is a theme without overrides.
 */
export function decodeCustomColors(token: string): Record<string, string> {
  const raw = String(token ?? "").trim().toLowerCase();
  if (raw.length <= MASK_LENGTH || !tokenPattern.test(raw)) return {};

  const mask = Number.parseInt(raw.slice(0, MASK_LENGTH), 36);
  if (!Number.isInteger(mask) || mask <= 0) return {};

  const indices = DISPLAY_PALETTE_KEYS.map((_, index) => index).filter(
    (index) => (mask & (1 << index)) !== 0,
  );
  // A token of the wrong length is a broken link, not a partial one.
  if (raw.length !== MASK_LENGTH + indices.length * HEX_LENGTH) return {};

  const colors: Record<string, string> = {};
  for (let position = 0; position < indices.length; position += 1) {
    const start = MASK_LENGTH + position * HEX_LENGTH;
    const value = raw.slice(start, start + HEX_LENGTH);
    if (!hexPattern.test(value)) return {};
    colors[DISPLAY_PALETTE_KEYS[indices[position]]] = `#${value}`;
  }

  return colors;
}
