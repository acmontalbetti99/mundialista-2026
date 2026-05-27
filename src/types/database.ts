export type PhaseCode = 'group' | 'r16' | 'r8' | 'qf' | 'sf' | 'final';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Phase {
  id: number;
  code: PhaseCode;
  name_en: string;
  name_es: string;
  order_index: number;
  predictions_deadline: string | null;
  created_at: string;
}

export interface Team {
  id: number;
  code: string;
  name_en: string;
  name_es: string;
  flag_emoji: string | null;
  group_letter: string | null;
}

export interface Match {
  id: string;
  phase_id: number;
  match_number: number;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'finished';
  created_at: string;
  updated_at: string;
}

export interface MatchWithTeams extends Match {
  home_team: Team | null;
  away_team: Team | null;
  phase: Phase;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  match_points: number;
  bracket_points: number;
  scored_predictions?: number;
  exact_hits: number;
  winning_predictions: number;
  total_predictions: number;
  bracket_hits: number;
  bracket_picks: number;
}

export type BracketCategoryCode = 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'champion';

export interface BracketCategory {
  code: BracketCategoryCode;
  name_en: string;
  name_es: string;
  max_picks: number;
  points_per_correct: number;
  order_index: number;
}

export interface BracketPrediction {
  id: string;
  user_id: string;
  category_code: BracketCategoryCode;
  team_id: number;
  points_awarded: number;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string;
}
