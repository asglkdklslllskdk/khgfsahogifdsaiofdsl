# personal site

A black-and-white text-mode site built with [Astro](https://astro.build) and
hosted on Cloudflare. Posts are Markdown files.

## where things live

| what                    | file                                  |
| ----------------------- | ------------------------------------- |
| posts                   | `src/content/posts/YYYY-MM-DD-slug.md` |
| about page text         | `src/content/pages/about.md`          |
| links page              | `src/data/links.json`                 |
| name, email, info box   | `src/data/site.json`                  |
| images for posts        | `public/images/`                      |
| styles                  | `src/styles/global.css`               |
| text-drawn borders      | `src/scripts/frame.js`                |
| page layout / menu      | `src/layouts/Base.astro`              |
| site domain (for RSS)   | `site` in `astro.config.mjs`          |

## writing a post

Create `src/content/posts/2026-12-01-my-post.md`:

```md
---
title: my post
date: 2026-12-01
description: optional one-liner
draft: false
---

Post text in Markdown.
```

- URL is the filename without the date: `/posts/my-post/`
- `draft: true` hides it from the live site (it still shows locally)
- images: put the file in `public/images/` and write `![alt text](/images/photo.jpg)`

Or use Pages CMS (below) to do the same from a browser.

## run locally

Requires Node 24 (or 22.23.4+).

```sh
npm install
npm run dev      # http://localhost:4321, reloads as you edit
npm run build    # outputs the static site to dist/
```

## frame borders

Any element with `class="frame"` gets a text border.
`data-frame` picks the style (`ascii`, `single`, `double`, `round`, `hash`, `dots`),
`data-title` / `data-footer` put a label in the top / bottom edge.
In `.astro` files, use `<Panel title="...">` from `src/components/Panel.astro`.
