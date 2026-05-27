import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth, useLang } from '@/store';
import type { Match, Phase, Team } from '@/types/database';
import type { Translations } from '@/locales/translations';

type Tab = 'matches' | 'deadlines' | 'bracket';

export function Admin() {
  const { profile } = useAuth();
  const { lang, t } = useLang();
  const [tab, setTab] = useState<Tab>('matches');

  if (!profile?.is_admin) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <p className="text-ink-400">{t.admin.notAdmin}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-4xl tracking-wide text-cup-red">{t.admin.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('matches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'matches' ? 'bg-cup-red text-white' : 'bg-ink-800 text-ink-200'
            }`}
          >
            {t.admin.matches}
          </button>
          <button
            onClick={() => setTab('deadlines')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'deadlines' ? 'bg-cup-red text-white' : 'bg-ink-800 text-ink-200'
            }`}
          >
            {t.admin.deadlines}
          </button>
          <button
            onClick={() => setTab('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'bracket' ? 'bg-cup-red text-white' : 'bg-ink-800 text-ink-200'
            }`}
          >
            {t.bracket.title}
          </button>
        </div>
      </div>

      {tab === 'matches' && <AdminMatches lang={lang} t={t} />}
      {tab === 'deadlines' && <AdminDeadlines lang={lang} />}
      {tab === 'bracket' && <AdminBracket t={t} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matches tab
// ---------------------------------------------------------------------------
function AdminMatches({ lang, t }: { lang: 'es' | 'en'; t: Translations }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<number>(1);
  const [showForm, setShowForm] = useState(false);

  async function reload() {
    const [p, tm, m] = await Promise.all([
      supabase.from('phases').select('*').order('order_index'),
      supabase.from('teams').select('*').order('name_en'),
      supabase.from('matches').select('*').eq('phase_id', activePhaseId).order('match_number'),
    ]);
    if (p.data) setPhases(p.data as Phase[]);
    if (tm.data) setTeams(tm.data as Team[]);
    if (m.data) setMatches(m.data as Match[]);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [activePhaseId]);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  async function saveScore(match: Match, home: number | null, away: number | null) {
    await supabase
      .from('matches')
      .update({ home_score: home, away_score: away })
      .eq('id', match.id);
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {phases.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePhaseId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              p.id === activePhaseId ? 'bg-cup-red text-white' : 'bg-ink-800 text-ink-200'
            }`}
          >
            {lang === 'es' ? p.name_es : p.name_en}
          </button>
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        + {t.admin.addMatch}
      </button>

      {showForm && (
        <NewMatchForm
          phaseId={activePhaseId}
          teams={teams}
          onSaved={() => { setShowForm(false); reload(); }}
          t={t}
        />
      )}

      <div className="grid gap-2">
        {matches.map((m) => {
          const home = m.home_team_id ? teamMap.get(m.home_team_id) : null;
          const away = m.away_team_id ? teamMap.get(m.away_team_id) : null;
          return (
            <AdminMatchRow
              key={m.id}
              match={m}
              home={home ?? null}
              away={away ?? null}
              lang={lang}
              t={t}
              onSaveScore={(h, a) => saveScore(m, h, a)}
              onDelete={async () => {
                if (!confirm('Delete this match? This also removes all predictions for it.')) return;
                await supabase.from('matches').delete().eq('id', m.id);
                await reload();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function NewMatchForm({
  phaseId,
  teams,
  onSaved,
  t,
}: {
  phaseId: number;
  teams: Team[];
  onSaved: () => void;
  t: Translations;
}) {
  const [matchNumber, setMatchNumber] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [venue, setVenue] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.from('matches').insert({
      phase_id: phaseId,
      match_number: parseInt(matchNumber, 10),
      home_team_id: home ? parseInt(home, 10) : null,
      away_team_id: away ? parseInt(away, 10) : null,
      kickoff_at: kickoff,
      venue: venue || null,
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          type="number"
          placeholder="#"
          value={matchNumber}
          onChange={(e) => setMatchNumber(e.target.value)}
          className="input-text"
        />
        <select value={home} onChange={(e) => setHome(e.target.value)} className="input-text">
          <option value="">{t.admin.home}</option>
          {teams.map((tm) => (
            <option key={tm.id} value={tm.id}>{tm.flag_emoji} {tm.name_en}</option>
          ))}
        </select>
        <select value={away} onChange={(e) => setAway(e.target.value)} className="input-text">
          <option value="">{t.admin.away}</option>
          {teams.map((tm) => (
            <option key={tm.id} value={tm.id}>{tm.flag_emoji} {tm.name_en}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          className="input-text"
        />
      </div>
      <input
        type="text"
        placeholder={t.admin.venue}
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        className="input-text w-full"
      />
      <button onClick={submit} disabled={busy || !matchNumber || !kickoff} className="btn-primary">
        {t.admin.save}
      </button>
    </div>
  );
}

function AdminMatchRow({
  match, home, away, lang, t, onSaveScore, onDelete,
}: {
  match: Match;
  home: Team | null;
  away: Team | null;
  lang: 'es' | 'en';
  t: Translations;
  onSaveScore: (h: number | null, a: number | null) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [h, setH] = useState(match.home_score?.toString() ?? '');
  const [a, setA] = useState(match.away_score?.toString() ?? '');

  return (
    <div className="card p-4 flex items-center gap-3 flex-wrap">
      <div className="font-mono text-ink-400 w-12">#{match.match_number}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          {home?.flag_emoji} {home ? (lang === 'es' ? home.name_es : home.name_en) : '???'}
          <span className="text-ink-400 mx-2">vs</span>
          {away?.flag_emoji} {away ? (lang === 'es' ? away.name_es : away.name_en) : '???'}
        </div>
        <div className="text-xs text-ink-400 font-mono">
          {format(new Date(match.kickoff_at), 'd MMM yyyy HH:mm')}
          {match.venue && <span> · {match.venue}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={h}
          onChange={(e) => setH(e.target.value)}
          className="w-14 input-text text-center"
        />
        <span className="text-ink-400">–</span>
        <input
          type="number"
          min={0}
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="w-14 input-text text-center"
        />
        <button
          onClick={() => onSaveScore(h === '' ? null : parseInt(h, 10), a === '' ? null : parseInt(a, 10))}
          className="btn-primary text-xs px-3 py-1.5"
        >
          {t.admin.save}
        </button>
        <button onClick={onDelete} className="text-cup-red text-xs px-2">✕</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deadlines tab
// ---------------------------------------------------------------------------
function AdminDeadlines({ lang }: { lang: 'es' | 'en' }) {
  const [phases, setPhases] = useState<Phase[]>([]);

  async function load() {
    const { data } = await supabase.from('phases').select('*').order('order_index');
    if (data) setPhases(data as Phase[]);
  }
  useEffect(() => { load(); }, []);

  async function autoSet(phase: Phase) {
    // Compute deadline = (earliest kickoff in this phase) - 24h
    const { data } = await supabase
      .from('matches')
      .select('kickoff_at')
      .eq('phase_id', phase.id)
      .order('kickoff_at')
      .limit(1);
    if (!data || data.length === 0) {
      alert('No matches in this phase yet.');
      return;
    }
    const first = new Date((data[0] as { kickoff_at: string }).kickoff_at);
    const deadline = new Date(first.getTime() - 24 * 60 * 60 * 1000);
    await supabase.from('phases').update({ predictions_deadline: deadline.toISOString() }).eq('id', phase.id);
    await load();
  }

  async function setManual(phase: Phase, isoLocal: string) {
    const iso = new Date(isoLocal).toISOString();
    await supabase.from('phases').update({ predictions_deadline: iso }).eq('id', phase.id);
    await load();
  }

  return (
    <div className="space-y-3">
      {phases.map((p) => (
        <div key={p.id} className="card p-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl">{lang === 'es' ? p.name_es : p.name_en}</div>
            <div className="text-xs text-ink-400 font-mono mt-1">
              {p.predictions_deadline
                ? format(new Date(p.predictions_deadline), "d MMM yyyy 'at' HH:mm")
                : '—'}
            </div>
          </div>
          <input
            type="datetime-local"
            defaultValue={
              p.predictions_deadline
                ? format(new Date(p.predictions_deadline), "yyyy-MM-dd'T'HH:mm")
                : ''
            }
            onBlur={(e) => e.target.value && setManual(p, e.target.value)}
            className="input-text"
          />
          <button onClick={() => autoSet(p)} className="btn-ghost text-sm">
            ⚡ Auto (-24h)
          </button>
        </div>
      ))}
      <p className="text-xs text-ink-400 pt-2">
        ⚡ Auto sets the deadline to 24 hours before the earliest kickoff in that phase.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bracket-deadline tab
// ---------------------------------------------------------------------------
function AdminBracket({ t }: { t: Translations }) {
  const [deadline, setDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bracket_deadline')
      .single();
    const v = (data as { value: unknown } | null)?.value;
    setDeadline(typeof v === 'string' ? v : null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(isoLocal: string) {
    const iso = new Date(isoLocal).toISOString();
    await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(iso), updated_at: new Date().toISOString() })
      .eq('key', 'bracket_deadline');
    await load();
  }

  async function autoSetFromGroup() {
    const { data } = await supabase
      .from('matches')
      .select('kickoff_at')
      .eq('phase_id', 1)
      .order('kickoff_at')
      .limit(1);
    if (!data || data.length === 0) {
      alert('No group-stage matches yet. Add the opening match first.');
      return;
    }
    const first = new Date((data[0] as { kickoff_at: string }).kickoff_at);
    const dl = new Date(first.getTime() - 24 * 60 * 60 * 1000);
    await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(dl.toISOString()), updated_at: new Date().toISOString() })
      .eq('key', 'bracket_deadline');
    await load();
  }

  if (loading) return <div className="text-ink-400">{t.loading}</div>;

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="font-display text-2xl mb-2">{t.admin.bracketDeadline}</div>
        <p className="text-xs text-ink-400 mb-4">{t.admin.bracketDeadlineHint}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="datetime-local"
            defaultValue={deadline ? format(new Date(deadline), "yyyy-MM-dd'T'HH:mm") : ''}
            onBlur={(e) => e.target.value && save(e.target.value)}
            className="input-text"
          />
          <button onClick={autoSetFromGroup} className="btn-ghost text-sm">
            ⚡ Auto (-24h from opener)
          </button>
        </div>
        {deadline && (
          <div className="mt-4 text-sm text-cup-gold font-mono">
            {format(new Date(deadline), "EEE d MMM yyyy · HH:mm 'UTC'")}
          </div>
        )}
      </div>
    </div>
  );
}
