# Mundialista 2026

A predictions game for the FIFA World Cup 2026 — Supabase + React + Netlify.

## What it does

- Players sign in with Google (one click)
- Each player submits a score prediction per match
- Each player picks a "bracket" of which teams advance through each knockout round, plus a champion
- Predictions are private until each phase deadline passes; after that, everyone's picks are revealed
- 24h before the first kickoff of each phase, that phase's predictions lock
- The bracket locks once, 24h before the tournament opener
- 6 phases: Group (12×4) → R32 → R16 → QF → SF → Final
- Admin sets up matches, advances phases, and enters actual results
- Server-side scoring (Postgres function) → no client-side tampering possible
- Realtime leaderboard updates when results are entered

## Scoring

### Match-by-match predictions

| Outcome | Points |
| --- | --- |
| Exact score (e.g. predicted 2–0, actual 2–0) | **5** |
| Correct winner only | **2** |
| At least one team's score correct (but not exact) | **+1** (on top of winner pts) |
| Nothing right | 0 |

### Bracket predictions (the long shots)

Pick teams that you think will reach each knockout round. Locks once, 24h before opening match.

| Pick | How many | Points per correct |
|---|---|---|
| Teams reaching R32 (group survivors) | 32 | +1 each |
| Teams reaching R16 | 16 | +2 each |
| Teams reaching QF | 8 | +3 each |
| Teams reaching SF | 4 | +5 each |
| Teams reaching Final | 2 | +10 each |
| World Champion | 1 | +50 |

**Max bracket points: 178** (32 + 32 + 24 + 20 + 20 + 50)

A team you pick to win is auto-included in all earlier rounds. Removing a team from an early round also removes them from all later rounds. Picks are immutable rows (delete + re-insert to change).

**Examples:**
- Spain wins 2–0, you said Spain 2–0 → **5** match points
- Spain wins 2–0, you said Spain 3–0 → **2 + 1 = 3** match points
- You picked Spain as champion and they win → **+50** + (+10 for Final + +5 for SF + +3 for QF + +2 for R16 + +1 for R32) = **+71** bracket points for that team alone

## Stack

- React 18 + Vite + TypeScript + Tailwind CSS
- Zustand (state) + react-router (routing)
- Supabase: Postgres + Auth (Google OAuth) + Realtime + RLS
- Netlify (hosting)

## First-time setup

### 1. Create the Supabase project

1. Go to https://supabase.com and create a new project.
2. In Authentication → Providers, enable **Google** (you'll need a Google OAuth client ID and secret from Google Cloud Console — set the redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`).
3. In the SQL editor, run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_scoring_and_leaderboard.sql`
   - `supabase/migrations/004_seed_teams.sql`
   - `supabase/migrations/005_rename_phases.sql`
   - `supabase/migrations/006_bracket_predictions.sql`
4. After your first Google sign-in, promote yourself to admin:
   ```sql
   update public.profiles set is_admin = true where display_name = '<your name>';
   ```

### 2. Configure the app

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Settings → API)
npm install
npm run dev
```

### 3. Deploy to Netlify

1. Push to GitHub.
2. Connect the repo to Netlify.
3. Build command: `npm run build`, publish dir: `dist`.
4. Environment variables: same two as `.env`.
5. Add your Netlify URL to Supabase → Authentication → URL Configuration → Site URL and Redirect URLs.

## Game flow

### Before the tournament
1. Admin signs in with Google.
2. Run the promotion SQL above to grant admin rights.
3. Admin goes to **Admin → Matches**, adds the 72 group-stage matches (FIFA fixture list).
4. Admin goes to **Admin → Deadlines**, clicks "⚡ Auto (-24h)" for the Group phase. This sets the deadline 24h before the earliest kickoff.
5. Players sign in and submit their group-stage predictions.

### During the tournament
1. Predictions for the Group phase lock automatically at the deadline.
2. After the group stage finishes, admin enters all results in **Admin → Matches**. Points are computed server-side immediately.
3. Once the R32 teams are determined, admin adds those matches, then auto-sets the R32 deadline. Repeat for each subsequent phase.

### Fairness guarantees (enforced by Postgres RLS)
- A user can only INSERT/UPDATE predictions for `user_id = auth.uid()`.
- Predictions cannot be created or modified after that phase's `predictions_deadline`.
- Other users' predictions are invisible until the deadline passes.
- `points_awarded` is not writable by users — only by the database trigger.
- Only admin profiles can write to `matches`, `teams`, `phases`.

## Data model

- `profiles` — one per auth user; `is_admin` flag
- `phases` — 6 rows; `predictions_deadline` per phase
- `teams` — 48 rows
- `matches` — fixtures; admin enters `home_score`/`away_score` → trigger recomputes points
- `predictions` — one per (user, match); unique constraint enforces it
- `prediction_audit` — append-only log of every prediction change (dispute resolution)
- `leaderboard` (view) — total points per user, sorted

## Common admin tasks (SQL)

```sql
-- Promote a user to admin
update public.profiles set is_admin = true where display_name = 'Marco';

-- See who has and hasn't made predictions for the next phase
select pr.display_name, count(p.id) as picks
from public.profiles pr
left join public.predictions p on p.user_id = pr.id
left join public.matches m on m.id = p.match_id and m.phase_id = 1
group by pr.id
order by picks desc;

-- Audit trail for a specific user
select * from public.prediction_audit where user_id = '<uuid>' order by changed_at desc;

-- Clear a wrong result so you can re-enter it
update public.matches set home_score = null, away_score = null where id = '<match-uuid>';
```

## Known things to do later

- Push notifications when a deadline is near
- Per-group standings prediction (predict the table, not just matches)
- "Joker" / double-points match per phase
- Group chat / banter feed
- Export final standings as image to share
