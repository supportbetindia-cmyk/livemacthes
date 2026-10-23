import Link from "next/link";
import { Suspense } from "react";
import { getTeams } from "@/lib/cricket";
import { PageHeader, Section, Skeleton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getDictionary, alternates, getLocale } from "../dictionaries";
import { Logo } from "@/components/Logo";

async function TeamList() {
  const [dict, lang, teams] = await Promise.all([getDictionary(), getLocale(), getTeams()]);
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  // Sportmonks marks national sides; women's sides are named "India W", "Australia W"...
  const groups = [
    { title: dict.teams.international, list: sorted.filter((t) => t.national && !t.name.endsWith(" W")) },
    { title: dict.teams.women, list: sorted.filter((t) => t.national && t.name.endsWith(" W")) },
    { title: dict.teams.leagues, list: sorted.filter((t) => !t.national) },
  ].filter((g) => g.list.length);

  return groups.map((g) => (
    <Section key={g.title} title={g.title}>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {g.list.map((t) => (
          <Link
            key={t.id}
            href={`/${lang}/teams/${t.id}`}
            className="surface surface-hover group flex items-center gap-3.5 px-4 py-3.5"
          >
            <Logo src={t.genericFlag} size={32} />
            <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
            <Icon name="chevronRight" className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </Section>
  ));
}

export async function generateMetadata() {
  return { title: (await getDictionary()).teams.title, alternates: await alternates("/teams") };
}

export default async function TeamsPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.teams.title} />
      <Suspense fallback={<Skeleton />}>
        <TeamList />
      </Suspense>
    </>
  );
}
