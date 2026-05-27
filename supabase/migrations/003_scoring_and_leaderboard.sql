-- ============================================================================
-- Scoring function and leaderboard
-- ============================================================================
-- Point rules:
--   Exact score AND correct winner    → 5 points
--   Otherwise:
--     Correct winner (or draw)         → +2 points
--     Correct score of one team        → +1 point per team matched (max 1 — for partial guesses)
-- ============================================================================

create or replace function public.calculate_match_points(
  predicted_home smallint,
  predicted_away smallint,
  actual_home smallint,
  actual_away smallint
) returns smallint
language plpgsql immutable as $$
declare
  exact_match boolean;
  winner_correct boolean;
  partial_score boolean;
  pts smallint := 0;
begin
  if actual_home is null or actual_away is null then
    return null;
  end if;

  exact_match := (predicted_home = actual_home and predicted_away = actual_away);
  if exact_match then
    return 5;
  end if;

  -- Winner / draw correct?
  winner_correct := (
    (predicted_home > predicted_away and actual_home > actual_away)
    or (predicted_home < predicted_away and actual_home < actual_away)
    or (predicted_home = predicted_away and actual_home = actual_away)
  );
  if winner_correct then
    pts := pts + 2;
  end if;

  -- Correct score of at least one team (but not both, since that case = exact match handled above)
  partial_score := (predicted_home = actual_home or predicted_away = actual_away);
  if partial_score then
    pts := pts + 1;
  end if;

  return pts;
end;
$$;

-- ============================================================================
-- When admin enters/updates a match score, recompute points for all predictions
-- on that match. Runs as security definer so it can write to points_awarded.
-- ============================================================================
create or replace function public.recompute_match_points()
returns trigger language plpgsql security definer as $$
begin
  if new.home_score is null or new.away_score is null then
    -- Score cleared: null out all prediction points for this match
    update public.predictions
       set points_awarded = null
     where match_id = new.id;
    return new;
  end if;

  update public.predictions p
     set points_awarded = public.calculate_match_points(
       p.predicted_home, p.predicted_away,
       new.home_score, new.away_score
     )
   where p.match_id = new.id;

  -- Mark match as finished
  if new.status != 'finished' then
    new.status := 'finished';
  end if;

  return new;
end;
$$;

create trigger matches_score_trigger
  before update of home_score, away_score on public.matches
  for each row execute function public.recompute_match_points();

-- ============================================================================
-- Leaderboard view
-- ============================================================================
create or replace view public.leaderboard as
select
  pr.id as user_id,
  pr.display_name,
  pr.avatar_url,
  coalesce(sum(p.points_awarded), 0)::int as total_points,
  count(p.id) filter (where p.points_awarded is not null)::int as scored_predictions,
  count(p.id) filter (where p.points_awarded = 5)::int as exact_hits,
  count(p.id) filter (where p.points_awarded > 0)::int as winning_predictions,
  count(p.id)::int as total_predictions
from public.profiles pr
left join public.predictions p on p.user_id = pr.id
group by pr.id, pr.display_name, pr.avatar_url
order by total_points desc, exact_hits desc, pr.display_name asc;

grant select on public.leaderboard to authenticated;

-- ============================================================================
-- Per-phase leaderboard view
-- ============================================================================
create or replace view public.leaderboard_by_phase as
select
  pr.id as user_id,
  pr.display_name,
  ph.id as phase_id,
  ph.code as phase_code,
  coalesce(sum(p.points_awarded), 0)::int as phase_points,
  count(p.id) filter (where p.points_awarded = 5)::int as exact_hits
from public.profiles pr
cross join public.phases ph
left join public.matches m on m.phase_id = ph.id
left join public.predictions p on p.user_id = pr.id and p.match_id = m.id
group by pr.id, pr.display_name, ph.id, ph.code
order by ph.order_index, phase_points desc;

grant select on public.leaderboard_by_phase to authenticated;
