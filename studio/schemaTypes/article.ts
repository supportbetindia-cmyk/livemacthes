import { defineArrayMember, defineField, defineType } from "sanity";

// Keep in sync with the site's languages (src/lib/i18n.ts). The site falls back to English when a translation is empty.
const languages = [
  { name: "en", title: "English" },
  { name: "hi", title: "हिन्दी" },
];

// Article body editor: paragraphs, headings, quotes, lists, bold/italic, links, and photos between paragraphs.
// Rendered on the site by src/components/ArticleBody.tsx (keep the two in step).
const richText = [
  defineArrayMember({
    type: "block",
    styles: [
      { title: "Paragraph", value: "normal" },
      { title: "Heading", value: "h2" },
      { title: "Subheading", value: "h3" },
      { title: "Quote", value: "blockquote" },
    ],
    lists: [
      { title: "Bullets", value: "bullet" },
      { title: "Numbers", value: "number" },
    ],
    marks: {
      decorators: [
        { title: "Bold", value: "strong" },
        { title: "Italic", value: "em" },
      ],
      annotations: [
        defineArrayMember({
          name: "link",
          type: "object",
          title: "Link",
          fields: [defineField({ name: "href", type: "url", validation: (r) => r.required().uri({ scheme: ["http", "https"] }) })],
        }),
      ],
    },
  }),
  defineArrayMember({
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({ name: "alt", title: "Describe the photo (for blind readers and Google)", type: "string" }),
      defineField({ name: "caption", title: "Caption", type: "string" }),
    ],
  }),
];

// One sub-field per language, e.g. title.en / title.hi. English is required where `required` is set.
const localized = (name: string, title: string, type: "string" | "text" | "richText", required = false) =>
  defineField({
    name,
    title,
    type: "object",
    fields: languages.map(({ name: lang, title }) => {
      const must = required && lang === "en";
      if (type === "richText") return defineField({ name: lang, title, type: "array", of: richText, validation: (r) => (must ? r.required() : r) });
      if (type === "string") return defineField({ name: lang, title, type: "string", validation: (r) => (must ? r.required() : r) });
      return defineField({ name: lang, title, type: "text", rows: 3, validation: (r) => (must ? r.required() : r) });
    }),
  });

export const article = defineType({
  name: "article",
  title: "News article",
  type: "document",
  fields: [
    localized("title", "Title", "string", true),
    defineField({ name: "slug", title: "Slug (URL)", type: "slug", options: { source: "title.en" }, validation: (r) => r.required() }),
    defineField({ name: "author", title: "Author", type: "string", description: "Shown as “ARJUN · 3 HRS AGO”." }),
    localized("excerpt", "Short summary", "text"),
    localized("body", "Body", "richText", true),
    defineField({ name: "image", title: "Cover image", type: "image", options: { hotspot: true } }),
    defineField({ name: "publishedAt", title: "Published at", type: "datetime", initialValue: () => new Date().toISOString() }),
  ],
  orderings: [{ title: "Newest", name: "newest", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: { select: { title: "title.en", subtitle: "author", media: "image" } },
});
