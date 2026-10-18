import Link from "next/link";

// Player name that links to their profile when we know the Sportmonks player id.
export function PlayerLink({ id, lang, className = "", children }: { id?: string; lang: string; className?: string; children: React.ReactNode }) {
  return id ? (
    <Link href={`/${lang}/player/${id}`} className={`hover:underline ${className}`}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
