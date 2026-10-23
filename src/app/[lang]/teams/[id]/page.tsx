import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTeamMatches, getTeams } from "@/lib/cricket";
import { MatchCard, grid } from "@/components/MatchCard";
import { Empty, Section, Skeleton } from "@/components/ui";
import { alternates, getDictionary, getLocale } from "../../dictionaries";
import { Logo } from "@/components/Logo";

async function getTeam(id: string) {
  const team = (await getTeams()).find((t) => t.id === id);
  if (!team) notFound();
  return team;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/teams/[id]">) {
  const { id } = await params;
  return { title: (await getTeam(id)).name, alternates: await alternates(`/teams/${id}`) };
}

async function TeamView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, lang, team, matches] = await Promise.all([getDictionary(), getLocale(), getTeam(id), getTeamMatches(id)]);

  return (
    <>
      <header className="surface mb-10 flex items-center gap-5 p-6">
        <Logo src={team.genericFlag} size={64} />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{team.name}</h1>
      </header>
      <Section title={dict.teams.matches}>
        {matches.length ? (
          <div className={grid}>
            {matches.map((m) => <MatchCard key={m.id} match={m} lang={lang} t={dict.card} />)}
          </div>
        ) : (
          <Empty>{dict.teams.empty}</Empty>
        )}
      </Section>
    </>
  );
}

export default function TeamPage({ params }: PageProps<"/[lang]/teams/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <TeamView params={params} />
    </Suspense>
  );
}
