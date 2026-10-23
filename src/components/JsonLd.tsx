// Structured data for Google (schema.org). "<" is escaped so text from the API can't close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
