import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type { LeaderboardRow } from '@/types/database';

export function Leaderboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('leaderboard').select('*');
      if (data) setRows(data as LeaderboardRow[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
        const { data } = await supabase.from('leaderboard').select('*');
        if (data) setRows(data as LeaderboardRow[]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl tracking-wide">{t.leaderboard.title}</h1>

      {loading ? (
        <div className="text-ink-400 text-center py-12">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">{t.leaderboard.empty}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700 text-[10px] uppercase tracking-widest text-ink-400 font-mono">
                <th className="text-left px-4 py-3 w-12">{t.leaderboard.rank}</th>
                <th className="text-left px-4 py-3">{t.leaderboard.player}</th>
                <th className="text-right px-4 py-3">{t.leaderboard.points}</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">{t.leaderboard.exact}</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">{t.leaderboard.hits}</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">{t.leaderboard.total}</th>
                <th className="w-8 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMe = r.user_id === user?.id;
                const isExpanded = expanded === r.user_id;
                const podium = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <>
                    <tr
                      key={r.user_id}
                      onClick={() => setExpanded(isExpanded ? null : r.user_id)}
                      className={`border-b border-ink-700/50 last:border-0 transition-colors cursor-pointer ${
                        isMe ? 'bg-cup-gold/5 hover:bg-cup-gold/10' : 'hover:bg-ink-800/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-ink-400">
                        {podium ?? <span className="text-ink-600">#</span>}
                        {!podium && <span className="ml-1">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} className="w-7 h-7 rounded-full" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-ink-700 flex items-center justify-center text-xs">
                              {r.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-medium ${isMe ? 'text-cup-gold' : ''}`}>
                            {r.display_name}
                            {isMe && <span className="ml-2 text-[10px] uppercase opacity-60">you</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-display text-2xl text-cup-gold">{r.total_points}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell font-mono text-ink-200">{r.exact_hits}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell font-mono text-ink-200">{r.winning_predictions}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell font-mono text-ink-400">{r.total_predictions}</td>
                      <td className="px-2 text-ink-400 text-xs">{isExpanded ? '▾' : '▸'}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-ink-900/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <BreakdownCell label="Match points" value={r.match_points} accent="green" />
                            <BreakdownCell label="Bracket points" value={r.bracket_points} accent="gold" />
                            <BreakdownCell label="Exact scores" value={r.exact_hits} />
                            <BreakdownCell
                              label="Bracket hits"
                              value={`${r.bracket_hits} / ${r.bracket_picks}`}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BreakdownCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'green' | 'gold';
}) {
  const colors = { green: 'text-pitch-500', gold: 'text-cup-gold' } as const;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-400 font-mono">{label}</div>
      <div className={`font-display text-2xl mt-1 ${accent ? colors[accent] : ''}`}>{value}</div>
    </div>
  );
}
