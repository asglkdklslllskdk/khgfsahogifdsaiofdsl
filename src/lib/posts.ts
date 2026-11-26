import { getCollection } from "astro:content";

/** All posts, newest first. Drafts show up in `npm run dev` but not on the live site. */
export async function getPosts() {
  const posts = await getCollection("posts", ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 2026-11-25 */
export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
