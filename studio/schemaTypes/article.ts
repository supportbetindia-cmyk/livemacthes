import { defineField, defineType } from "sanity";

// Keep in sync with the site's languages (src/lib/i18n.ts). The site falls back to English when a translation is empty.
const languages = [
  { name: "en", title: "English" },
  { name: "hi", title: "हिन्दी" },
];

// One sub-field per language, e.g. title.en / title.hi. English is required where `required` is set.
const localized = (name: string, title: string, type: "string" | "text", required = false) =>
  defineField({
    name,
    title,
    type: "object",
    fields: languages.map(({ name: lang, title }) => {
      const must = required && lang === "en";
      return type === "string"
        ? defineField({ name: lang, title, type: "string", validation: (r) => (must ? r.required() : r) })
        : defineField({ name: lang, title, type: "text", rows: name === "body" ? 16 : 3, validation: (r) => (must ? r.required() : r) });
    }),
  });

export const article = defineType({
  name: "article",
  title: "News article",
  type: "document",
  fields: [
    localized("title", "Title", "string", true),
    defineField({ name: "slug", title: "Slug (URL)", type: "slug", options: { source: "title.en" }, validation: (r) => r.required() }),
    localized("excerpt", "Short summary", "text"),
    // ponytail: plain text body, paragraphs separated by a blank line. Switch to Portable Text if you need bold/links/images inside.
    localized("body", "Body", "text", true),
    defineField({ name: "image", title: "Cover image", type: "image", options: { hotspot: true } }),
    defineField({ name: "publishedAt", title: "Published at", type: "datetime", initialValue: () => new Date().toISOString() }),
  ],
  orderings: [{ title: "Newest", name: "newest", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: { select: { title: "title.en", subtitle: "publishedAt", media: "image" } },
});
