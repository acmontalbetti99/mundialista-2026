import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type { Match, Phase, Prediction, Team } from '@/types/database';
import { Countdown } from '@/components/Countdown';

interface MatchRow {
  match: Match;
  home: Team | null;
  away: Team | null;
  prediction: Prediction | null;
}

export function Predictions() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Map<number, Team>>(new Map());
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load phases + teams once
  useEffect(() => {
    (async () => {
      const [phasesRes, teamsRes] = await Promise.all([
        supabase.from('phases').select('*').order('order_index'),
        supabase.from('teams').select('*'),
      ]);
      if (phasesRes.data) {
        setPhases(phasesRes.data as Phase[]);
        if (!activePhaseId) setActivePhaseId((phasesRes.data as Phase[])[0].id);
      }
      if (teamsRes.data) {
        setTeams(new Map((teamsRes.data as Team[]).map((tm) => [tm.id, tm])));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load matches + predictions when phase changes
  useEffect(() => {
    if (!activePhaseId || !user) return;
    setLoading(true);
    (async () => {
      const [matchesRes, predsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('phase_id', activePhaseId).order('kickoff_at'),
        supabase.from('predictions').select('*').eq('user_id', user.id),
      ]);
      if (matchesRes.data) setMatches(matchesRes.data as Match[]);
      if (predsRes.data) {
        setPredictions(new Map((predsRes.data as Prediction[]).map((p) => [p.match_id, p])));
      }
      setLoading(false);
    })();
  }, [activePhaseId, user]);

  const activePhase = phases.find((p) => p.id === activePhaseId) ?? null;
  const isLocked = activePhase?.predictions_deadline
    ? new Date(activePhase.predictions_deadline) < new Date()
    : false;

  const rows: MatchRow[] = useMemo(
    () =>
      matches.map((m) => ({
        match: m,
        home: m.home_team_id ? teams.get(m.home_team_id) ?? null : null,
        away: m.away_team_id ? teams.get(m.away_team_id) ?? null : null,
        prediction: predictions.get(m.id) ?? null,
      })),
    [matches, teams, predictions]
  );

  async function savePrediction(matchId: string, home: number, away: number) {
    if (!user || isLocked) return;
    const existing = predictions.get(matchId);
    if (existing) {
      const { data, error } = await supabase
        .from('predictions')
        .update({ predicted_home: home, predicted_away: away })
        .eq('id', existing.id)
        .select()
        .single();
      if (data && !error) {
        setPredictions((m) => new Map(m).set(matchId, data as Prediction));
      }
    } else {
      const { data, error } = await supabase
        .from('predictions')
        .insert({ user_id: user.id, match_id: matchId, predicted_home: home, predicted_away: away })
        .select()
        .single();
      if (data && !error) {
        setPredictions((m) => new Map(m).set(matchId, data as Prediction));
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wide">{t.predictions.title}</h1>
        <p className="text-xs text-ink-400 mt-2">{t.predictions.pointsRule}</p>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {phases.map((p) => {
          const active = p.id === activePhaseId;
          const locked = p.predictions_deadline && new Date(p.predictions_deadline) < new Date();
          return (
            <button
              key={p.id}
              onClick={() => setActivePhaseId(p.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-semibold transition-all border ${
                active
                  ? 'bg-cup-gold text-ink-900 border-cup-gold'
                  : 'bg-ink-800/40 border-ink-700 text-ink-200 hover:border-ink-600'
              }`}
            >
              {lang === 'es' ? p.name_es : p.name_en}
              {locked && <span className="ml-2 text-[10px] opacity-60">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Phase header */}
      {activePhase && (
        <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400 font-mono">{t.predictions.deadline}</div>
            <div className="font-medium mt-1">
              {activePhase.predictions_deadline
                ? format(new Date(activePhase.predictions_deadline), "d MMM yyyy · HH:mm")
                : '—'}
            </div>
          </div>
          <Countdown deadline={activePhase.predictions_deadline} compact />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-400">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">{t.predictions.noMatches}</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <MatchCard
              key={r.match.id}
              row={r}
              locked={isLocked}
              onSave={(h, a) => savePrediction(r.match.id, h, a)}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  row,
  locked,
  onSave,
  lang,
}: {
  row: MatchRow;
  locked: boolean;
  onSave: (h: number, a: number) => Promise<void>;
  lang: 'es' | 'en';
}) {
  const [home, setHome] = useState<string>(row.prediction?.predicted_home?.toString() ?? '');
  const [away, setAway] = useState<string>(row.prediction?.predicted_away?.toString() ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setHome(row.prediction?.predicted_home?.toString() ?? '');
    setAway(row.prediction?.predicted_away?.toString() ?? '');
  }, [row.prediction]);

  async function commit(h: string, a: string) {
    const hn = parseInt(h, 10);
    const an = parseInt(a, 10);
    if (Number.isNaN(hn) || Number.isNaN(an) || hn < 0 || an < 0) return;
    setStatus('saving');
    await onSave(hn, an);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1500);
  }

  const homeName = row.home ? (lang === 'es' ? row.home.name_es : row.home.name_en) : '???';
  const awayName = row.away ? (lang === 'es' ? row.away.name_es : row.away.name_en) : '???';

  return (
    <div className="card p-4 sm:p-5 hover:border-ink-600 transition-colors">
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 justify-end text-right min-w-0">
          <div className="min-w-0">
            <div className="font-semibold truncate">{homeName}</div>
            <div className="text-[10px] text-ink-400 font-mono uppercase">{row.home?.code ?? '—'}</div>
          </div>
          <div className="text-2xl sm:text-3xl">{row.home?.flag_emoji ?? '⚽'}</div>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={30}
            value={home}
            disabled={locked}
            onChange={(e) => setHome(e.target.value)}
            onBlur={(e) => commit(e.target.value, away)}
            className="input-score"
          />
          <span className="text-ink-400 font-display text-2xl">–</span>
          <input
            type="number"
            min={0}
            max={30}
            value={away}
            disabled={locked}
            onChange={(e) => setAway(e.target.value)}
            onBlur={(e) => commit(home, e.target.value)}
            className="input-score"
          />
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="text-2xl sm:text-3xl">{row.away?.flag_emoji ?? '⚽'}</div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{awayName}</div>
            <div className="text-[10px] text-ink-400 font-mono uppercase">{row.away?.code ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-ink-700 flex items-center justify-between text-xs">
        <span className="text-ink-400 font-mono">
          {format(new Date(row.match.kickoff_at), 'd MMM · HH:mm')}
          {row.match.venue && <span> · {row.match.venue}</span>}
        </span>
        <span>
          {locked && <span className="chip bg-ink-700 text-ink-400">🔒 {row.prediction ? 'OK' : '—'}</span>}
          {!locked && status === 'saving' && <span className="text-cup-gold">⋯</span>}
          {!locked && status === 'saved' && <span className="text-pitch-500">✓</span>}
        </span>
      </div>
    </div>
  );
}
