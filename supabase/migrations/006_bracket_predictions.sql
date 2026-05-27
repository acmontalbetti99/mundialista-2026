-- ============================================================================
-- Migration 006: Bracket predictions (long-shot tournament picks)
-- ============================================================================
-- Players pick which teams will reach each knockout round and who wins it all.
-- All bracket picks lock together at one shared deadline (24h before opener).
--
-- Categories (max picks per category):
--   r32        — 32 teams reach R32           +1 each
--   r16        — 16 teams reach R16           +2 each
--   qf         —  8 teams reach QF            +3 each
--   sf         —  4 teams reach SF            +5 each
--   final      —  2 teams reach the Final     +10 each
--   champion   —  1 team wins it              +50
--
-- Max bracket points: 32 + 32 + 24 + 20 + 20 + 50 = 178
-- ============================================================================

-- ----------------------------------------------------------------------------
-- App settings: simple key/value table for global config (bracket deadline, etc.)
-- ----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('bracket_deadline', 'null'::jsonb),
  ('tournament_first_kickoff', 'null'::jsonb);

alter table public.app_settings enable row level security;

create policy "settings_select_all" on public.app_settings for select to authenticated using (true);
create policy "settings_admin_write" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Bracket categories (lookup table)
-- ----------------------------------------------------------------------------
create table public.bracket_categories (
  code text primary key,                  -- 'r32', 'r16', 'qf', 'sf', 'final', 'champion'
  name_en text not null,
  name_es text not null,
  max_picks smallint not null,            -- 32, 16, 8, 4, 2, 1
  points_per_correct smallint not null,   -- 1, 2, 3, 5, 10, 50
  order_index smallint not null
);

insert into public.bracket_categories (code, name_en, name_es, max_picks, points_per_correct, order_index) values
  ('r32',       'Reach Round of 32',  'Llegan a Dieciseisavos',     32, 1,  1),
  ('r16',       'Reach Round of 16',  'Llegan a Octavos',           16, 2,  2),
  ('qf',        'Reach Quarter-finals','Llegan a Cuartos',           8, 3,  3),
  ('sf',        'Reach Semi-finals',  'Llegan a Semifinales',        4, 5,  4),
  ('final',     'Reach the Final',    'Llegan a la Final',           2, 10, 5),
  ('champion',  'World Champion',     'Campeón del Mundo',           1, 50, 6);

alter table public.bracket_categories enable row level security;
create policy "bracket_categories_select_all" on public.bracket_categories for select to authenticated using (true);
create policy "bracket_categories_admin_write" on public.bracket_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Bracket predictions: one row per (user, category, team)
-- ----------------------------------------------------------------------------
create table public.bracket_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_code text not null references public.bracket_categories(code),
  team_id smallint not null references public.teams(id),
  points_awarded smallint default 0,  -- 0 until evaluated; equals category.points_per_correct if team actually advanced
  created_at timestamptz not null default now(),
  constraint bracket_user_cat_team_unique unique (user_id, category_code, team_id)
);

create index idx_bracket_user on public.bracket_predictions(user_id);
create index idx_bracket_category on public.bracket_predictions(category_code);

-- Lock down points_awarded from user writes
revoke update (points_awarded) on public.bracket_predictions from authenticated;

alter table public.bracket_predictions enable row level security;

-- ----------------------------------------------------------------------------
-- Helper: has the bracket deadline passed?
-- ----------------------------------------------------------------------------
create or replace function public.bracket_deadline_passed()
returns boolean language sql stable as $$
  select coalesce(
    (select (value::text::timestamptz < now())
     from public.app_settings where key = 'bracket_deadline' and value::text != 'null'),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Helper: enforce max_picks per category at write time (defensive — UI also enforces)
-- ----------------------------------------------------------------------------
create or replace function public.enforce_bracket_max_picks()
returns trigger language plpgsql as $$
declare
  max_allowed smallint;
  current_count smallint;
begin
  select max_picks into max_allowed
  from public.bracket_categories
  where code = new.category_code;

  select count(*) into current_count
  from public.bracket_predictions
  where user_id = new.user_id and category_code = new.category_code;

  if (tg_op = 'INSERT' and current_count >= max_allowed) then
    raise exception 'Maximum % picks allowed for category %', max_allowed, new.category_code;
  end if;

  return new;
end;
$$;

create trigger bracket_predictions_max_check
  before insert on public.bracket_predictions
  for each row execute function public.enforce_bracket_max_picks();

-- ----------------------------------------------------------------------------
-- RLS: own-row reads before deadline; everyone after deadline
-- ----------------------------------------------------------------------------
create policy "bracket_select_own_or_after_deadline"
  on public.bracket_predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.bracket_deadline_passed()
    or public.is_admin()
  );

create policy "bracket_insert_own_before_deadline"
  on public.bracket_predictions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not public.bracket_deadline_passed()
  );

create policy "bracket_delete_own_before_deadline"
  on public.bracket_predictions for delete
  to authenticated
  using (
    user_id = auth.uid()
    and not public.bracket_deadline_passed()
  );

-- No UPDATE policy — bracket picks are immutable rows (delete + re-insert to change)

-- ----------------------------------------------------------------------------
-- Team advancement view: which teams have reached which round, based on actual results
-- ----------------------------------------------------------------------------
-- A team has "reached" a phase if they have at least one match in that phase
-- (whether played yet or not). For finished phases, this is unambiguous.
-- For the champion: the team that wins the Final match.
-- ----------------------------------------------------------------------------
create or replace view public.team_advancement as
with team_phase_appearances as (
  select distinct
    t.id as team_id,
    ph.code as phase_code,
    ph.order_index
  from public.teams t
  join public.matches m on (m.home_team_id = t.id or m.away_team_id = t.id)
  join public.phases ph on ph.id = m.phase_id
),
champions as (
  select
    case
      when m.home_score > m.away_score then m.home_team_id
      when m.away_score > m.home_score then m.away_team_id
      else null  -- final not yet decided
    end as team_id
  from public.matches m
  join public.phases ph on ph.id = m.phase_id
  where ph.code = 'final'
    and m.home_score is not null
    and m.away_score is not null
)
select
  tpa.team_id,
  tpa.phase_code,
  true as reached
from team_phase_appearances tpa
union all
select team_id, 'champion' as phase_code, true as reached
from champions
where team_id is not null;

grant select on public.team_advancement to authenticated;

-- ----------------------------------------------------------------------------
-- Function: recompute bracket points for a single user
-- ----------------------------------------------------------------------------
create or replace function public.recompute_bracket_points_for_user(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bracket_predictions bp
     set points_awarded = case
       when exists (
         select 1 from public.team_advancement ta
         where ta.team_id = bp.team_id and ta.phase_code = bp.category_code
       ) then (select points_per_correct from public.bracket_categories where code = bp.category_code)
       else 0
     end
   where bp.user_id = p_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Function: recompute bracket points for ALL users (called by match score trigger)
-- ----------------------------------------------------------------------------
create or replace function public.recompute_all_bracket_points()
returns void language plpgsql security definer as $$
begin
  update public.bracket_predictions bp
     set points_awarded = case
       when exists (
         select 1 from public.team_advancement ta
         where ta.team_id = bp.team_id and ta.phase_code = bp.category_code
       ) then (select points_per_correct from public.bracket_categories where code = bp.category_code)
       else 0
     end;
end;
$$;

-- ----------------------------------------------------------------------------
-- Hook into the match-scoring trigger so bracket points recompute together.
-- We replace the existing trigger function to additionally call the bracket recompute.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_match_points()
returns trigger language plpgsql security definer as $$
begin
  if new.home_score is null or new.away_score is null then
    update public.predictions
       set points_awarded = null
     where match_id = new.id;
  else
    update public.predictions p
       set points_awarded = public.calculate_match_points(
         p.predicted_home, p.predicted_away,
         new.home_score, new.away_score
       )
     where p.match_id = new.id;

    if new.status != 'finished' then
      new.status := 'finished';
    end if;
  end if;

  -- A match score change can shift team advancement (especially the final → champion).
  -- Recompute bracket points for everyone. Cheap; only ~6×players×average_picks rows.
  perform public.recompute_all_bracket_points();

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Updated leaderboard view: sums match points + bracket points
-- ----------------------------------------------------------------------------
create or replace view public.leaderboard as
with match_pts as (
  select user_id, coalesce(sum(points_awarded), 0)::int as pts,
         count(*) filter (where points_awarded = 5)::int as exact_hits,
         count(*) filter (where points_awarded > 0)::int as winning_predictions,
         count(*)::int as total_predictions
  from public.predictions
  group by user_id
),
bracket_pts as (
  select user_id, coalesce(sum(points_awarded), 0)::int as pts,
         count(*) filter (where points_awarded > 0)::int as bracket_hits,
         count(*)::int as bracket_picks
  from public.bracket_predictions
  group by user_id
)
select
  pr.id as user_id,
  pr.display_name,
  pr.avatar_url,
  (coalesce(m.pts, 0) + coalesce(b.pts, 0))::int as total_points,
  coalesce(m.pts, 0)::int as match_points,
  coalesce(b.pts, 0)::int as bracket_points,
  coalesce(m.exact_hits, 0)::int as exact_hits,
  coalesce(m.winning_predictions, 0)::int as winning_predictions,
  coalesce(m.total_predictions, 0)::int as total_predictions,
  coalesce(b.bracket_hits, 0)::int as bracket_hits,
  coalesce(b.bracket_picks, 0)::int as bracket_picks
from public.profiles pr
left join match_pts m on m.user_id = pr.id
left join bracket_pts b on b.user_id = pr.id
order by total_points desc, exact_hits desc, pr.display_name asc;

grant select on public.leaderboard to authenticated;
