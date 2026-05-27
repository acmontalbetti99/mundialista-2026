import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type { Match, Phase, Prediction, Team } from '@/types/database';
import type { Translations } from '@/locales/translations';

interface ResultRow {
  match: Match;
  home: Team | null;
  away: Team | null;
  myPrediction: Prediction | null;
  phase: Phase;
}

export function Results() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [matchesRes, teamsRes, phasesRes, predsRes] = await Promise.all([
        supabase.from('matches').select('*').order('kickoff_at', { ascending: false }),
        supabase.from('teams').select('*'),
        supabase.from('phases').select('*'),
        supabase.from('predictions').select('*').eq('user_id', user.id),
      ]);
      if (matchesRes.data && teamsRes.data && phasesRes.data) {
        const teamMap = new Map((teamsRes.data as Team[]).map((t) => [t.id, t]));
        const phaseMap = new Map((phasesRes.data as Phase[]).map((p) => [p.id, p]));
        const predMap = new Map(((predsRes.data ?? []) as Prediction[]).map((p) => [p.match_id, p]));
        const result: ResultRow[] = (matchesRes.data as Match[]).map((m) => ({
          match: m,
          home: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
          away: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
          myPrediction: predMap.get(m.id) ?? null,
          phase: phaseMap.get(m.phase_id)!,
        }));
        setRows(result);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl tracking-wide">{t.results.title}</h1>

      {loading ? (
        <div className="text-center py-12 text-ink-400">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">{t.results.noResults}</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <ResultCard key={r.match.id} row={r} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ row, lang, t }: { row: ResultRow; lang: 'es' | 'en'; t: Translations }) {
  const finished = row.match.home_score !== null && row.match.away_score !== null;
  const homeName = row.home ? (lang === 'es' ? row.home.name_es : row.home.name_en) : '???';
  const awayName = row.away ? (lang === 'es' ? row.away.name_es : row.away.name_en) : '???';
  const phaseName = lang === 'es' ? row.phase.name_es : row.phase.name_en;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-ink-400 font-mono">
          {phaseName} · {format(new Date(row.match.kickoff_at), 'd MMM HH:mm')}
        </div>
        {finished ? (
          <span className="chip bg-pitch-500/10 text-pitch-500">✓</span>
        ) : (
          <span className="chip bg-ink-700 text-ink-400">{t.results.pending}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2 justify-end text-right min-w-0">
          <span className="font-semibold truncate">{homeName}</span>
          <span className="text-2xl">{row.home?.flag_emoji ?? '⚽'}</span>
        </div>
        <div className="font-display text-3xl tabular-nums px-3">
          {finished ? `${row.match.home_score} – ${row.match.away_score}` : '–'}
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-2xl">{row.away?.flag_emoji ?? '⚽'}</span>
          <span className="font-semibold truncate">{awayName}</span>
        </div>
      </div>

      {row.myPrediction && (
        <div className="mt-3 pt-3 border-t border-ink-700 flex items-center justify-between text-sm">
          <span className="text-ink-400">
            {t.results.yourPick}:{' '}
            <span className="font-mono text-ink-200">
              {row.myPrediction.predicted_home}–{row.myPrediction.predicted_away}
            </span>
          </span>
          {row.myPrediction.points_awarded !== null && (
            <span
              className={`chip ${
                row.myPrediction.points_awarded === 5
                  ? 'bg-cup-gold text-ink-900'
                  : row.myPrediction.points_awarded > 0
                  ? 'bg-pitch-500/15 text-pitch-500'
                  : 'bg-ink-700 text-ink-400'
              }`}
            >
              +{row.myPrediction.points_awarded} pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}
