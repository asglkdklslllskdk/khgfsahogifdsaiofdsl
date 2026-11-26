import type { APIContext } from "astro";

// tells search engines everything may be indexed, and where the sitemap is
export function GET({ site }: APIContext) {
  const sitemap = new URL("/sitemap-index.xml", site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
