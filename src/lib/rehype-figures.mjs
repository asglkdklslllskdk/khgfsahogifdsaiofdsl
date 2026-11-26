/**
 * Turns images in Markdown into framed figures, the same markup as a post's gallery:
 *
 *   ![title](/images/a.jpg "optional description")
 *
 * - alt text  -> title in the box's top border   ┌─[ title ]──┐
 *   ending the alt text with a year moves it to the bottom border:
 *   ![sun study, 2026](...)  ->  ┌─[ sun study ]─┐ ... └──[ 2026 ]─┘
 * - "title"   -> description under the image (and in the viewer)
 * - a run of image-only paragraphs in a row becomes one 2-column grid;
 *   a lone image is shown full width.
 */
import { imageDims } from "./image-dims.mjs";

export default function rehypeFigures() {
  return (tree) => walk(tree);
}

const isWhitespace = (n) => n.type === "text" && !n.value.trim();
const isImg = (n) => n.type === "element" && n.tagName === "img";

function isImageParagraph(n) {
  return (
    n.type === "element" &&
    n.tagName === "p" &&
    n.children.some(isImg) &&
    n.children.every((c) => isImg(c) || isWhitespace(c) || (c.type === "element" && c.tagName === "br"))
  );
}

function figure(img) {
  let title = img.properties.alt || "";
  let year;
  const m = title.match(/^(.*?),?\s*(\d{4})$/);
  if (m) { title = m[1].trim(); year = m[2]; img.properties.alt = title; }
  const description = img.properties.title;
  delete img.properties.title;
  img.properties.loading = "lazy";
  img.properties.decoding = "async";
  const dims = imageDims(img.properties.src);
  if (dims) { img.properties.width = dims.width; img.properties.height = dims.height; }
  // the wrapper holds the image's space and shows loading dots until it arrives
  const wrap = { type: "element", tagName: "span", properties: { className: ["img-wrap"] }, children: [img] };
  const children = [wrap];
  if (description) {
    children.push({
      type: "element",
      tagName: "figcaption",
      properties: {},
      children: [{ type: "text", value: String(description) }],
    });
  }
  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["frame"], dataFrame: "single", dataTitle: title || undefined, dataFooter: year },
    children,
  };
}

function walk(node) {
  if (!node.children) return;
  const out = [];
  let gallery = null;
  for (const child of node.children) {
    if (isImageParagraph(child)) {
      if (!gallery) {
        gallery = { type: "element", tagName: "div", properties: { className: ["gallery"] }, children: [] };
        out.push(gallery);
      }
      gallery.children.push(...child.children.filter(isImg).map(figure));
      continue;
    }
    if (gallery && isWhitespace(child)) continue; // blank lines between image paragraphs
    gallery = null;
    walk(child);
    out.push(child);
  }
  for (const n of out) {
    const cls = n.properties && n.properties.className;
    if (Array.isArray(cls) && cls.includes("gallery") && n.children.length === 1) cls.push("single");
  }
  node.children = out;
}
