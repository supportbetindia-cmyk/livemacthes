import Link from "next/link";
import { Suspense } from "react";
import { getRankings, type Ranking } from "@/lib/cricket";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { getDictionary, alternates } from "../dictionaries";
import { Logo } from "@/components/Logo";

const FORMATS: Ranking["format"][] = ["TEST", "ODI", "T20I"];
const GENDERS: Ranking["gender"][] = ["men", "women"];

async function Table({ searchParams }: { searchParams: Promise<{ format?: string; gender?: string }> }) {
  const sp = await searchParams;
  const format = FORMATS.find((f) => f === sp.format) ?? "T20I";
  const gender = GENDERS.find((g) => g === sp.gender) ?? "men";
  const [dict, rankings] = await Promise.all([getDictionary(), getRankings()]);
  const t = dict.rankings;
  const teams = rankings.find((r) => r.format === format && r.gender === gender)?.teams ?? [];
  const href = (f: string, g: string) => `?format=${f}&gender=${g}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {GENDERS.map((g) => (
          <Link key={g} href={href(format, g)} aria-current={g === gender ? "page" : undefined} className="chip">
            {t[g]}
          </Link>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {FORMATS.map((f) => (
          <Link key={f} href={href(f, gender)} aria-current={f === format ? "page" : undefined} className="chip">
            {f === "TEST" ? "Test" : f}
          </Link>
        ))}
      </div>

      {teams.length ? (
        <div className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>{t.team}</th><th>{t.matches}</th><th>{t.points}</th><th>{t.rating}</th></tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.name}>
                  <td>
                    <span className="flex items-center gap-3 font-medium">
                      <span className="w-5 text-muted">{team.position}</span>
                      <Logo src={team.img} size={24} />
                      {team.name}
                    </span>
                  </td>
                  <td>{team.matches}</td>
                  <td>{team.points}</td>
                  <td className="font-bold">{team.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="trophy">{t.empty}</Empty>
      )}
    </>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).rankings.title, alternates: await alternates("/rankings") };
}

export default async function RankingsPage({ searchParams }: PageProps<"/[lang]/rankings">) {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.rankings.title} />
      <Suspense fallback={<Skeleton />}>
        <Table searchParams={searchParams} />
      </Suspense>
    </>
  );
}
