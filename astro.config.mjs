// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeFigures from "./src/lib/rehype-figures.mjs";

export default defineConfig({
  // change to your real domain once it's set up (used for RSS + canonical URLs)
  site: "https://example.com",

  build: {
    // put the css inside each page instead of a separate file: one less request
    // before the page can draw
    inlineStylesheets: "always",
  },

  markdown: {
    // keep code blocks plain black and white (no color syntax highlighting)
    syntaxHighlight: false,
    // images in posts become framed figures (see src/lib/rehype-figures.mjs)
    processor: unified({ rehypePlugins: [rehypeFigures] }),
  },
});
