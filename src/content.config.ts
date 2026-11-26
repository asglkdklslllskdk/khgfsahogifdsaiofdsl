import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Blog posts: one Markdown file per post in src/content/posts/.
// Filenames like 2026-11-25-hello-world.md become /posts/hello-world/
const posts = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/posts",
    generateId: ({ entry }) =>
      entry.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    // optional image grid shown after the post text (edited in Pages CMS)
    gallery: z
      .array(
        z.object({
          image: z.string(),
          title: z.string().nullish(),
          description: z.string().nullish(),
        }),
      )
      .nullish(),
  }),
});

// Standalone pages written in Markdown (currently just about.md).
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { posts, pages };
