import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type { LeaderboardRow, Phase } from '@/types/database';
import { Countdown } from '@/components/Countdown';

export function Dashboard() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [myRow, setMyRow] = useState<LeaderboardRow | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [nextPhase, setNextPhase] = useState<Phase | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;

      const { data: rows } = await supabase
        .from('leaderboard')
        .select('*');
      if (rows) {
        const mine = (rows as LeaderboardRow[]).find((r) => r.user_id === user.id);
        setMyRow(mine ?? null);
        if (mine) setRank((rows as LeaderboardRow[]).findIndex((r) => r.user_id === user.id) + 1);
      }

      const { data: phases } = await supabase
        .from('phases')
        .select('*')
        .order('order_index');
      const upcoming = (phases as Phase[] | null)?.find(
        (p) => p.predictions_deadline && new Date(p.predictions_deadline) > new Date()
      );
      setNextPhase(upcoming ?? null);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card-glow p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 text-[180px] opacity-5 select-none pointer-events-none">⚽</div>
        <div className="relative">
          <div className="text-ink-400 text-sm font-mono uppercase tracking-widest">{t.dashboard.title}</div>
          <div className="font-display text-4xl sm:text-5xl tracking-wide mt-1">{useAuth.getState().profile?.display_name}</div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <Stat label={t.dashboard.yourRank} value={rank ? `#${rank}` : '—'} accent="gold" />
            <Stat label={t.dashboard.totalPoints} value={myRow?.total_points ?? 0} accent="green" />
            <Stat label={t.dashboard.exactHits} value={myRow?.exact_hits ?? 0} accent="red" />
          </div>

          {myRow && (myRow.match_points > 0 || myRow.bracket_points > 0) && (
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-pitch-500/10 text-pitch-500">
                {myRow.match_points} match pts
              </span>
              <span className="chip bg-cup-gold/15 text-cup-gold">
                {myRow.bracket_points} bracket pts
              </span>
              <span className="chip bg-ink-700 text-ink-200">
                {myRow.bracket_hits}/{myRow.bracket_picks} bracket hits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Next deadline */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400 font-mono">{t.dashboard.nextDeadline}</div>
            <div className="font-display text-2xl mt-1">
              {nextPhase ? (lang === 'es' ? nextPhase.name_es : nextPhase.name_en) : t.dashboard.noDeadline}
            </div>
          </div>
          {nextPhase && <Countdown deadline={nextPhase.predictions_deadline} />}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/predictions" className="btn-primary">
            {t.dashboard.makePredictions} →
          </Link>
          <Link to="/leaderboard" className="btn-ghost">
            {t.dashboard.viewLeaderboard}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: 'gold' | 'green' | 'red' }) {
  const colors = {
    gold: 'text-cup-gold',
    green: 'text-pitch-500',
    red: 'text-cup-red',
  } as const;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-400 font-mono">{label}</div>
      <div className={`font-display text-4xl sm:text-5xl mt-1 ${colors[accent]}`}>{value}</div>
    </div>
  );
}
