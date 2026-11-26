// Reads an image's pixel size at build time, so pages can reserve the right amount
// of space before the image downloads (no jumping when it arrives).
// Works for images in public/ referenced as /images/... ; returns null otherwise.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize } from "image-size";

const cache = new Map();

export function imageDims(src) {
  if (typeof src !== "string" || !src.startsWith("/")) return null;
  if (cache.has(src)) return cache.get(src);
  let dims = null;
  try {
    const file = join(process.cwd(), "public", decodeURI(src.split(/[?#]/)[0]));
    const s = imageSize(readFileSync(file));
    // phone photos can be stored sideways with a rotation flag
    const turned = s.orientation && s.orientation >= 5;
    dims = turned ? { width: s.height, height: s.width } : { width: s.width, height: s.height };
  } catch {
    dims = null;
  }
  cache.set(src, dims);
  return dims;
}
