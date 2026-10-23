import Link from "next/link";
import { Suspense } from "react";
import { getPlayer, type BatCareer, type BowlCareer } from "@/lib/cricket";
import { formatDate } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { Empty, Section, Skeleton } from "@/components/ui";
import { alternates, getDictionary, getLocale } from "../../dictionaries";

const fmt = (n: number | null, d = 2) => (n === null || !Number.isFinite(n) ? "–" : n.toFixed(d));
const batAvg = (b: BatCareer) => (b.innings - b.notOuts > 0 ? b.runs / (b.innings - b.notOuts) : null);
const batSR = (b: BatCareer) => (b.balls ? (b.runs / b.balls) * 100 : null);
const overs = (balls: number) => `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ""}`;
const econ = (b: BowlCareer) => (b.balls ? (b.runs / b.balls) * 6 : null);
const bowlAvg = (b: BowlCareer) => (b.wickets ? b.runs / b.wickets : null);
const bowlSR = (b: BowlCareer) => (b.wickets ? b.balls / b.wickets : null);
// "right-hand-bat" -> "Right-hand bat"
const style = (s?: string) => (s ? (s[0].toUpperCase() + s.slice(1)).replace(/-(bat|fast|medium|offbreak|legbreak|orthodox)/g, " $1") : undefined);

export async function generateMetadata({ params }: PageProps<"/[lang]/player/[id]">) {
  const { id } = await params;
  return { title: (await getPlayer(id)).name, alternates: await alternates(`/player/${id}`) };
}

async function PlayerView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, lang, p] = await Promise.all([getDictionary(), getLocale(), getPlayer(id)]);
  const t = dict.player;
  const mainTeam = p.teams.find((x) => x.national) ?? p.teams[0];
  const bowled = p.formats.filter((f) => f.bowl.balls > 0);

  const info = [
    p.dob && p.age !== undefined && [t.age, `${p.age} ${t.years}`, formatDate(p.dob, lang, false)],
    p.role && [t.role, p.role],
    p.battingStyle && [t.battingStyle, style(p.battingStyle)],
    p.bowlingStyle && [t.bowlingStyle, style(p.bowlingStyle)],
  ].filter(Boolean) as [string, string, string?][];

  return (
    <>
      {/* Header: photo, name, team, country */}
      <header className="surface mb-6 flex items-center gap-5 p-5 sm:p-6">
        <Logo src={p.img} size={96} className="bg-raised" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
            {mainTeam && (
              <Link href={`/${lang}/teams/${mainTeam.id}`} className="flex items-center gap-2 hover:text-link">
                <Logo src={mainTeam.img} size={22} />
                {mainTeam.name}
              </Link>
            )}
            {p.country && p.country.name !== mainTeam?.name && (
              <span className="flex items-center gap-2">
                <Logo src={p.country.img} size={20} round={false} />
                {p.country.name}
              </span>
            )}
          </div>
        </div>
        {p.role && <span className="hidden rounded-lg bg-raised px-3 py-1.5 text-sm font-semibold sm:block">{p.role}</span>}
      </header>

      {/* Info + teams */}
      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <section className="surface p-6">
          <h2 className="mb-5 text-lg font-bold">{t.info}</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            {info.map(([label, value, sub]) => (
              <div key={label}>
                <dd className="text-[17px] font-semibold">{value}</dd>
                {sub && <dd className="text-sm text-muted">{sub}</dd>}
                <dt className="mt-0.5 text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
        <section className="surface p-6">
          <h2 className="mb-5 text-lg font-bold">{t.career}</h2>
          <ul className="flex flex-col gap-4">
            {p.teams.slice(0, 6).map((team) => (
              <li key={team.id}>
                <Link href={`/${lang}/teams/${team.id}`} className="flex items-center gap-3 hover:text-link">
                  <Logo src={team.img} size={36} />
                  <span>
                    <span className="block font-semibold">{team.name}</span>
                    {team.from && <span className="block text-sm text-muted">{team.from === team.to ? team.from : `${team.from} – ${team.to}`}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!p.formats.length ? (
        <Empty icon="chart">{t.empty}</Empty>
      ) : (
        <>
          <Section title={t.battingCareer}>
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.format}</th><th>{t.mat}</th><th>{t.inns}</th><th>{t.no}</th><th>{t.runs}</th><th>{t.hs}</th>
                    <th>{t.avg}</th><th>{t.sr}</th><th>{t.s100}</th><th>{t.s50}</th><th>{t.s4}</th><th>{t.s6}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.formats.map(({ format, bat: b }) => (
                    <tr key={format}>
                      <td className="font-semibold">{format}</td>
                      <td>{b.matches}</td><td>{b.innings}</td><td>{b.notOuts}</td><td className="font-bold">{b.runs}</td><td>{b.highest}</td>
                      <td>{fmt(batAvg(b))}</td><td>{fmt(batSR(b))}</td><td>{b.hundreds}</td><td>{b.fifties}</td><td>{b.fours}</td><td>{b.sixes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {bowled.length > 0 && (
            <Section title={t.bowlingCareer}>
              <div className="surface overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.format}</th><th>{t.mat}</th><th>{t.inns}</th><th>{t.overs}</th><th>{t.runs}</th><th>{t.wkts}</th>
                      <th>{t.avg}</th><th>{t.econ}</th><th>{t.sr}</th><th>{t.fourW}</th><th>{t.fiveW}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowled.map(({ format, bowl: b }) => (
                      <tr key={format}>
                        <td className="font-semibold">{format}</td>
                        <td>{b.matches}</td><td>{b.innings}</td><td>{overs(b.balls)}</td><td>{b.runs}</td><td className="font-bold">{b.wickets}</td>
                        <td>{fmt(bowlAvg(b))}</td><td>{fmt(econ(b))}</td><td>{fmt(bowlSR(b), 1)}</td><td>{b.fourW}</td><td>{b.fiveW}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <Section title={t.seasons}>
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.season}</th><th>{t.format}</th><th>{t.mat}</th><th>{t.runs}</th><th>{t.hs}</th><th>{t.avg}</th><th>{t.sr}</th><th>{t.wkts}</th><th>{t.econ}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.seasons.map((s, i) => (
                    <tr key={`${s.season}-${s.format}-${i}`}>
                      <td className="font-semibold">{s.season}</td>
                      <td className="text-muted">{s.format}</td>
                      <td>{Math.max(s.bat?.matches ?? 0, s.bowl?.matches ?? 0)}</td>
                      <td className="font-bold">{s.bat?.runs ?? "–"}</td>
                      <td>{s.bat?.highest ?? "–"}</td>
                      <td>{s.bat ? fmt(batAvg(s.bat)) : "–"}</td>
                      <td>{s.bat ? fmt(batSR(s.bat)) : "–"}</td>
                      <td>{s.bowl?.wickets ?? "–"}</td>
                      <td>{s.bowl ? fmt(econ(s.bowl)) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{t.dataNote}</p>
          </Section>
        </>
      )}
    </>
  );
}

export default function PlayerPage({ params }: PageProps<"/[lang]/player/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <PlayerView params={params} />
    </Suspense>
  );
}
