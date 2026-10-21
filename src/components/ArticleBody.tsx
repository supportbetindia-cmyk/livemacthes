import Image from "next/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/react";
import { optimizable } from "@/lib/images";

// Shows an article body written in Sanity Studio (styles match studio/schemaTypes/article.ts).
// Server component: no JavaScript is sent to the browser for it.

type Photo = { url?: string; alt?: string; caption?: string };

// Sanity image URLs end in "-<width>x<height>.<ext>": the real size, so the photo keeps its shape with no layout jump.
const sizeOf = (url: string) => {
  const m = url.match(/-(\d+)x(\d+)\.\w+$/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 1200, height: 675 };
};

// Links come from editors, but still only allow real web links (no javascript: etc.).
const safeHref = (href?: string) => {
  try {
    return href && /^https?:$/.test(new URL(href).protocol) ? href : undefined;
  } catch {
    return undefined;
  }
};

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2 className="pt-4 text-2xl font-bold leading-snug tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="pt-2 text-xl font-bold leading-snug">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 italic text-muted">{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal space-y-2 pl-6">{children}</ol>,
  },
  marks: {
    link: ({ value, children }) => {
      const href = safeHref(value?.href);
      return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-2">{children}</a> : <>{children}</>;
    },
  },
  types: {
    image: ({ value }: { value: Photo }) => {
      if (!value.url) return null;
      return (
        <figure>
          <Image src={value.url} alt={value.alt ?? ""} {...sizeOf(value.url)} sizes="(min-width: 720px) 680px, 100vw" unoptimized={!optimizable(value.url)} className="h-auto w-full rounded-xl" />
          {value.caption && <figcaption className="mt-2 text-center text-sm text-muted">{value.caption}</figcaption>}
        </figure>
      );
    },
  },
};

export function ArticleBody({ value }: { value: PortableTextBlock[] }) {
  return (
    <div className="space-y-5 text-[17px] leading-[1.75]">
      <PortableText value={value} components={components} />
    </div>
  );
}
