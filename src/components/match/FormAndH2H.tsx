import Link from "next/link";
import type { Match, TeamInfo } from "@/lib/provider";
import { getHeadToHead, getRecentMatches } from "@/lib/cricket";
import { headToHead, teamForm, type FormResult } from "@/lib/match-tabs";
import { runs } from "@/components/MatchCard";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import type { Dict } from "@/app/[lang]/dictionaries";

// Match info extras: Team Form (last 5 per team) and Head to Head (last 10 meetings).
// Each is cached for hours, so only the first visitor after that triggers Sportmonks requests.

type T = Dict["match"];

const BOX: Record<FormResult, string> = { W: "bg-emerald-600 text-white", L: "bg-red-500 text-white", NR: "bg-raised text-muted" };

// "172-2 (14.4)" for one team in a match, "" if they haven't batted.
const teamScore = (m: Match, name: string) => {
  const s = m.score?.filter((x) => x.inning.startsWith(name + " ")) ?? [];
  return s.length ? `${s.map(runs).join(" & ")}` : "";
};
const teamOvers = (m: Match, name: string) => m.score?.filter((x) => x.inning.startsWith(name + " ")).at(-1)?.o;
const short = (m: Match, id?: string) => m.teamInfo?.find((t) => t.id === id)?.shortname;

function Heading({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <span className="shrink-0 text-xs text-muted sm:text-sm">{note}</span>
    </div>
  );
}

export async function TeamForm({ match, dict, lang }: { match: Match; dict: T; lang: string }) {
  const teams = (match.teamInfo ?? []).filter((t): t is TeamInfo & { id: string } => !!t.id);
  const lists = await Promise.all(teams.map((t) => getRecentMatches(t.id)));
  return (
    <section className="surface p-5 md:p-6">
      <Heading title={`${teams.map((t) => t.shortname || t.name).join(" & ")} ${dict.teamForm}`} note={dict.last5} />
      {teams.map((t, i) => {
        const form = teamForm(lists[i], t.id, match.id);
        return (
          <details key={t.id} className="group border-b border-border last:border-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <Logo src={t.img} size={28} />
              <span className="min-w-0 flex-1 truncate font-medium">
                <span className="sm:hidden">{t.shortname || t.name}</span><span className="hidden sm:inline">{t.name}</span>
              </span>
              <span className="flex gap-1.5">
                {form.map((f) => (
                  <span key={f.match.id} className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${BOX[f.result]}`}>{f.result}</span>
                ))}
              </span>
              <Icon name="chevronDown" className="h-4 w-4 text-muted transition group-open:rotate-180" />
            </summary>
            <ul className="mb-3 flex flex-col gap-1">
              {form.map(({ match: m, result }) => {
                const opp = m.teamInfo?.find((x) => x.id !== t.id);
                return (
                  <li key={m.id}>
                    <Link href={`/${lang}/match/${m.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-raised">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold ${BOX[result]}`}>{result}</span>
                      <span className="w-14 shrink-0 font-medium">vs {opp?.shortname || opp?.name}</span>
                      <span className="flex-1 truncate text-muted">{m.status}</span>
                      <span className="shrink-0 tabular-nums">{teamScore(m, t.name)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </section>
  );
}

export async function HeadToHead({ match, dict, lang }: { match: Match; dict: T; lang: string }) {
  const [a, b] = match.teamInfo ?? [];
  if (!a?.id || !b?.id) return null;
  const h2h = headToHead(await getHeadToHead(a.id, b.id), a.id, b.id, match.id);
  if (h2h.matches.length === 0) return null;
  const won = (m: Match) => (m.winnerId ? dict.won.replace("{team}", short(m, m.winnerId) ?? "") : dict.noResult);
  return (
    <section className="surface p-5 md:p-6">
      <Heading title={`${a.shortname || a.name} vs ${b.shortname || b.name} ${dict.h2h}`} note={dict.lastN.replace("{n}", String(h2h.matches.length))} />
      <div className="mb-2 flex items-center justify-between rounded-lg bg-raised px-4 py-4 md:px-6">
        <span className="flex items-center gap-3 font-semibold"><Logo src={a.img} size={40} />{a.shortname}</span>
        <span className="text-3xl font-bold tabular-nums">
          <span className="text-link">{h2h.winsA}</span><span className="mx-2 text-base text-muted">-</span><span>{h2h.winsB}</span>
        </span>
        <span className="flex items-center gap-3 font-semibold">{b.shortname}<Logo src={b.img} size={40} /></span>
      </div>
      <ul>
        {h2h.matches.map((m) => (
          <li key={m.id} className="border-b border-border last:border-0">
            <Link href={`/${lang}/match/${m.id}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-3 hover:bg-raised">
              <span className="tabular-nums">
                <span className="block text-xs text-muted">{a.shortname}</span>
                <b>{teamScore(m, a.name) || "-"}</b> <span className="text-xs text-muted">{teamOvers(m, a.name)}</span>
              </span>
              <span className="text-center">
                <span className={`block text-sm font-semibold ${m.winnerId === a.id ? "text-link" : ""}`}>{won(m)}</span>
                <span className="block text-xs text-muted">{m.name.split(", ").slice(1).join(", ")} · {m.date.slice(0, 4)}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-xs text-muted">{b.shortname}</span>
                <span className="text-xs text-muted">{teamOvers(m, b.name)}</span> <b>{teamScore(m, b.name) || "-"}</b>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
