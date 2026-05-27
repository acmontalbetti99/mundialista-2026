import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type {
  BracketCategory,
  BracketCategoryCode,
  BracketPrediction,
  Team,
} from '@/types/database';
import { Countdown } from '@/components/Countdown';

// Order from most → least restrictive. Picking a team for a later round
// must also include them in all earlier rounds (a champion is also in SF, QF, etc.)
const CATEGORY_ORDER: BracketCategoryCode[] = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];

export function Bracket() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<BracketCategory[]>([]);
  const [picks, setPicks] = useState<BracketPrediction[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BracketCategoryCode>('r32');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [teamsRes, catRes, picksRes, settingsRes] = await Promise.all([
        supabase.from('teams').select('*').order('name_en'),
        supabase.from('bracket_categories').select('*').order('order_index'),
        supabase.from('bracket_predictions').select('*').eq('user_id', user.id),
        supabase.from('app_settings').select('*').eq('key', 'bracket_deadline').single(),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data as Team[]);
      if (catRes.data) setCategories(catRes.data as BracketCategory[]);
      if (picksRes.data) setPicks(picksRes.data as BracketPrediction[]);
      if (settingsRes.data) {
        const v = (settingsRes.data as { value: unknown }).value;
        setDeadline(typeof v === 'string' ? v : null);
      }
      setLoading(false);
    })();
  }, [user]);

  const isLocked = !!deadline && new Date(deadline) < new Date();
  const activeCat = categories.find((c) => c.code === activeCategory);

  // Picks grouped by category
  const picksByCategory = useMemo(() => {
    const m = new Map<BracketCategoryCode, Set<number>>();
    CATEGORY_ORDER.forEach((c) => m.set(c, new Set()));
    picks.forEach((p) => m.get(p.category_code)?.add(p.team_id));
    return m;
  }, [picks]);

  async function togglePick(teamId: number) {
    if (!user || isLocked || !activeCat) return;
    const currentSet = picksByCategory.get(activeCategory)!;
    const isPicked = currentSet.has(teamId);

    if (isPicked) {
      // Removing: also remove from ALL stricter (later) categories
      const laterCats = CATEGORY_ORDER.slice(CATEGORY_ORDER.indexOf(activeCategory));
      const { error } = await supabase
        .from('bracket_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .in('category_code', laterCats);
      if (error) {
        alert(error.message);
        return;
      }
      setPicks((prev) =>
        prev.filter((p) => !(p.team_id === teamId && laterCats.includes(p.category_code)))
      );
    } else {
      // Adding: enforce max
      if (currentSet.size >= activeCat.max_picks) return;
      // Also auto-include in all EARLIER (less restrictive) categories not yet picked
      const earlierCats = CATEGORY_ORDER.slice(0, CATEGORY_ORDER.indexOf(activeCategory) + 1);
      const toInsert: { user_id: string; category_code: BracketCategoryCode; team_id: number }[] = [];
      for (const c of earlierCats) {
        const catMax = categories.find((x) => x.code === c)?.max_picks ?? 0;
        const set = picksByCategory.get(c)!;
        if (set.has(teamId)) continue;
        if (set.size >= catMax) {
          alert(
            `${t.bracket.categoryMaxed} (${t.bracket.categories[c]})`
          );
          return;
        }
        toInsert.push({ user_id: user.id, category_code: c, team_id: teamId });
      }
      if (toInsert.length === 0) return;
      const { data, error } = await supabase
        .from('bracket_predictions')
        .insert(toInsert)
        .select();
      if (error) {
        alert(error.message);
        return;
      }
      if (data) setPicks((prev) => [...prev, ...(data as BracketPrediction[])]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wide">{t.bracket.title}</h1>
        <p className="text-sm text-ink-400 mt-2">{t.bracket.subtitle}</p>
      </div>

      {/* Deadline banner */}
      {deadline ? (
        <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400 font-mono">
              {t.bracket.deadline}
            </div>
            <div className="font-medium mt-1">
              {format(new Date(deadline), "d MMM yyyy · HH:mm")}
            </div>
          </div>
          <Countdown deadline={deadline} compact />
        </div>
      ) : (
        <div className="card p-4 border-cup-red/30 text-sm text-cup-red">
          ⚠ {t.bracket.noDeadlineSet}
        </div>
      )}

      {/* Category tabs with progress */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {categories.map((c) => {
          const picked = picksByCategory.get(c.code)?.size ?? 0;
          const isActive = c.code === activeCategory;
          const isFull = picked === c.max_picks;
          return (
            <button
              key={c.code}
              onClick={() => setActiveCategory(c.code)}
              className={`relative p-3 rounded-lg text-left border transition-all ${
                isActive
                  ? 'bg-cup-gold/10 border-cup-gold text-cup-gold'
                  : 'bg-ink-800/40 border-ink-700 hover:border-ink-600'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-ink-400">
                +{c.points_per_correct} pts
              </div>
              <div className="font-semibold text-sm leading-tight mt-1">
                {lang === 'es' ? c.name_es : c.name_en}
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={`font-display text-2xl ${isFull ? 'text-pitch-500' : ''}`}>
                  {picked}
                </span>
                <span className="text-ink-400 text-xs font-mono">/ {c.max_picks}</span>
                {isFull && <span className="ml-auto text-pitch-500 text-xs">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Category detail */}
      {activeCat && (
        <div className="card p-4 sm:p-6">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="font-display text-2xl">
                {lang === 'es' ? activeCat.name_es : activeCat.name_en}
              </div>
              <div className="text-xs text-ink-400 mt-1">
                +{activeCat.points_per_correct} pts · {t.bracket.pointsHint}
                {CATEGORY_ORDER.indexOf(activeCategory) > 0 && (
                  <span className="block sm:inline sm:ml-2 text-cup-gold/70">
                    · {t.bracket.includedAutomatically}
                  </span>
                )}
              </div>
            </div>
            <div className="font-mono text-sm text-ink-400">
              {picksByCategory.get(activeCategory)?.size ?? 0} / {activeCat.max_picks}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-ink-400">{t.loading}</div>
          ) : (
            <TeamGrid
              teams={teams}
              picked={picksByCategory.get(activeCategory) ?? new Set()}
              max={activeCat.max_picks}
              disabled={isLocked}
              lang={lang}
              onToggle={togglePick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TeamGrid({
  teams,
  picked,
  max,
  disabled,
  lang,
  onToggle,
}: {
  teams: Team[];
  picked: Set<number>;
  max: number;
  disabled: boolean;
  lang: 'es' | 'en';
  onToggle: (id: number) => void;
}) {
  const isFull = picked.size >= max;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {teams.map((tm) => {
        const isPicked = picked.has(tm.id);
        const dimmed = !isPicked && (isFull || disabled);
        return (
          <button
            key={tm.id}
            disabled={disabled || (dimmed && !isPicked)}
            onClick={() => onToggle(tm.id)}
            className={`relative p-3 rounded-lg border text-left transition-all ${
              isPicked
                ? 'bg-cup-gold text-ink-900 border-cup-gold shadow-lg shadow-cup-gold/20'
                : dimmed
                ? 'bg-ink-900 border-ink-700 opacity-40 cursor-not-allowed'
                : 'bg-ink-900 border-ink-700 hover:border-cup-gold/60 hover:bg-ink-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{tm.flag_emoji ?? '⚽'}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-mono uppercase ${isPicked ? 'text-ink-700' : 'text-ink-400'}`}>
                  {tm.code}
                </div>
                <div className="text-sm font-semibold truncate">
                  {lang === 'es' ? tm.name_es : tm.name_en}
                </div>
              </div>
              {isPicked && <span className="text-ink-900 font-bold">✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
