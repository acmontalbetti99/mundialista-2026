-- ============================================================================
-- Row Level Security: enforces game integrity at the database level
-- ============================================================================
-- Rules enforced here:
--   1. Players can only see/edit their OWN predictions before the deadline.
--   2. After the deadline passes, all players can see all predictions (for that phase).
--   3. Only admins can create/edit matches, teams, phases, and enter scores.
--   4. Predictions cannot be inserted or updated after the phase deadline.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.phases enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_audit enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Helper: has the phase deadline passed for a given match?
create or replace function public.phase_deadline_passed(p_match_id uuid)
returns boolean language sql stable as $$
  select coalesce(
    (select p.predictions_deadline < now()
     from public.matches m
     join public.phases p on p.id = m.phase_id
     where m.id = p_match_id),
    false
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select is_admin from public.profiles where id = auth.uid()));
  -- prevents self-promotion to admin

-- ============================================================================
-- phases & teams: public read, admin write
-- ============================================================================
create policy "phases_select_all" on public.phases for select to authenticated using (true);
create policy "phases_admin_write" on public.phases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "teams_select_all" on public.teams for select to authenticated using (true);
create policy "teams_admin_write" on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- matches: public read, admin write
-- ============================================================================
create policy "matches_select_all" on public.matches for select to authenticated using (true);
create policy "matches_admin_write" on public.matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- predictions: the heart of game integrity
-- ============================================================================

-- SELECT: see your own anytime; see others' only after the phase deadline has passed
create policy "predictions_select_own_or_after_deadline"
  on public.predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.phase_deadline_passed(match_id)
    or public.is_admin()
  );

-- INSERT: only your own, and only if the deadline hasn't passed
create policy "predictions_insert_own_before_deadline"
  on public.predictions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not public.phase_deadline_passed(match_id)
  );

-- UPDATE: only your own predicted_home/away, only before the deadline.
-- points_awarded protection is enforced separately by revoking column update privilege.
create policy "predictions_update_own_before_deadline"
  on public.predictions for update
  to authenticated
  using (
    user_id = auth.uid()
    and not public.phase_deadline_passed(match_id)
  )
  with check (
    user_id = auth.uid()
    and not public.phase_deadline_passed(match_id)
  );

-- DELETE: users cannot delete predictions (audit integrity); admin can
create policy "predictions_delete_admin"
  on public.predictions for delete
  to authenticated
  using (public.is_admin());

-- Lock down points_awarded so users can't tamper with it. Only the scoring
-- function (security definer) and admins write to this column.
revoke update (points_awarded) on public.predictions from authenticated;

-- ============================================================================
-- audit log: insert by trigger only, read own or admin
-- ============================================================================
create policy "audit_select_own_or_admin"
  on public.prediction_audit for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Trigger to log prediction changes
create or replace function public.log_prediction_change()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    insert into public.prediction_audit (prediction_id, user_id, match_id, new_home, new_away)
    values (new.id, new.user_id, new.match_id, new.predicted_home, new.predicted_away);
  elsif tg_op = 'UPDATE' and (old.predicted_home != new.predicted_home or old.predicted_away != new.predicted_away) then
    insert into public.prediction_audit (prediction_id, user_id, match_id, old_home, old_away, new_home, new_away)
    values (new.id, new.user_id, new.match_id, old.predicted_home, old.predicted_away, new.predicted_home, new.predicted_away);
  end if;
  return new;
end;
$$;

create trigger predictions_audit_trigger
  after insert or update on public.predictions
  for each row execute function public.log_prediction_change();
