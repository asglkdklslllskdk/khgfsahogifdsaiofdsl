// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import rehypeFigures from "./src/lib/rehype-figures.mjs";
import siteSettings from "./src/data/site.json" with { type: "json" };

// accept the site address however it was typed: "name.com", "www.name.com",
// "https://name.com/". anything unusable is ignored instead of failing the build.
function siteUrl(raw) {
  let u = String(raw ?? "").trim();
  if (!u) return undefined;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const url = new URL(u);
    return url.hostname.includes(".") ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  // your domain: set "url" in src/data/site.json (Pages CMS > Site settings)
  site: siteUrl(siteSettings.url),

  // sitemap.xml for search engines
  integrations: [sitemap({ filter: (page) => !page.includes("/fractal") })],   // keep /fractal/ unlisted

  // fetch every internal link's page in the background as soon as the link is on
  // screen, so clicking it is instant (the pages are tiny)
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },

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
