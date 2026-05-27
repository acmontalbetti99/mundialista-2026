-- ============================================================================
-- Migration 005: Correct phase labels for the real 2026 format
-- ============================================================================
-- Original schema labeled phases as r16/r8/qf/sf/final.
-- The real format is: group → r32 → r16 → qf → sf → final.
-- This migration renames them. Safe to run before any match data exists.
-- ============================================================================

update public.phases set code = 'r32',  name_en = 'Round of 32',  name_es = 'Dieciseisavos'      where id = 2;
update public.phases set code = 'r16',  name_en = 'Round of 16',  name_es = 'Octavos de Final'   where id = 3;
update public.phases set code = 'qf',   name_en = 'Quarter-finals', name_es = 'Cuartos de Final' where id = 4;
update public.phases set code = 'sf',   name_en = 'Semi-finals',  name_es = 'Semifinales'        where id = 5;
update public.phases set code = 'final', name_en = 'Final',       name_es = 'Final'              where id = 6;

-- group stage row 1 stays as-is
