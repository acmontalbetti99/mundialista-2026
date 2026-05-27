-- ============================================================================
-- Mundialista 2026 — Initial Schema
-- ============================================================================
-- Soccer World Cup 2026 predictions game.
-- 48 teams, 104 matches, 6 phases. Admin manages results; players predict.
-- ============================================================================

-- Profiles: extends auth.users with app-specific data
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Phases: the 6 stages of the tournament
create table public.phases (
  id smallint primary key,
  code text not null unique, -- 'group', 'r16', 'r8', 'qf', 'sf', 'final'
  name_en text not null,
  name_es text not null,
  order_index smallint not null,
  predictions_deadline timestamptz, -- 24h before first match of this phase; admin-editable
  created_at timestamptz not null default now()
);

-- Teams: 48 national teams
create table public.teams (
  id smallint primary key generated always as identity,
  code text not null unique, -- 'ESP', 'URU', etc.
  name_en text not null,
  name_es text not null,
  flag_emoji text,
  group_letter char(1), -- 'A' through 'L' (12 groups in 2026 format)
  created_at timestamptz not null default now()
);

-- Matches: all fixtures across all phases
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  phase_id smallint not null references public.phases(id),
  match_number smallint not null, -- 1-104, FIFA numbering
  home_team_id smallint references public.teams(id), -- nullable for knockout slots before draw
  away_team_id smallint references public.teams(id),
  kickoff_at timestamptz not null,
  venue text,
  home_score smallint, -- null until match ends
  away_score smallint,
  status text not null default 'scheduled', -- 'scheduled', 'finished'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_match_number_unique unique (match_number),
  constraint matches_scores_check check (
    (home_score is null and away_score is null) or
    (home_score is not null and away_score is not null and home_score >= 0 and away_score >= 0)
  )
);

create index idx_matches_phase on public.matches(phase_id);
create index idx_matches_kickoff on public.matches(kickoff_at);

-- Predictions: one row per (user, match)
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home smallint not null check (predicted_home >= 0 and predicted_home <= 30),
  predicted_away smallint not null check (predicted_away >= 0 and predicted_away <= 30),
  points_awarded smallint, -- null until match is scored
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_user_match_unique unique (user_id, match_id)
);

create index idx_predictions_user on public.predictions(user_id);
create index idx_predictions_match on public.predictions(match_id);

-- Audit log for prediction changes (for disputes)
create table public.prediction_audit (
  id bigserial primary key,
  prediction_id uuid not null,
  user_id uuid not null,
  match_id uuid not null,
  old_home smallint,
  old_away smallint,
  new_home smallint not null,
  new_away smallint not null,
  changed_at timestamptz not null default now()
);

create index idx_audit_user on public.prediction_audit(user_id);

-- ============================================================================
-- Seed the 6 phases
-- ============================================================================
insert into public.phases (id, code, name_en, name_es, order_index) values
  (1, 'group',  'Group Stage',     'Fase de Grupos',    1),
  (2, 'r16',    'Round of 32',     'Dieciseisavos',     2),
  (3, 'r8',     'Round of 16',     'Octavos de Final',  3),
  (4, 'qf',     'Quarter-finals',  'Cuartos de Final',  4),
  (5, 'sf',     'Semi-finals',     'Semifinales',       5),
  (6, 'final',  'Final',           'Final',             6);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

create trigger predictions_updated_at before update on public.predictions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create profile on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
