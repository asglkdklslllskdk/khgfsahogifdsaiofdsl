// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // change to your real domain once it's set up (used for RSS + canonical URLs)
  site: "https://example.com",

  markdown: {
    // keep code blocks plain black and white (no color syntax highlighting)
    syntaxHighlight: false,
  },
});
