-- ============================================================================
-- Seed: 48 teams for the 2026 World Cup
-- ============================================================================
-- Note: The official draw determines group letters. The list below uses the 48
-- qualified nations as of mid-2026; groups (A–L) are placeholders the admin
-- should adjust once the official FIFA draw is finalized.
-- ============================================================================

insert into public.teams (code, name_en, name_es, flag_emoji, group_letter) values
  -- Hosts
  ('USA', 'United States',    'Estados Unidos',   '🇺🇸', 'A'),
  ('CAN', 'Canada',            'Canadá',           '🇨🇦', 'B'),
  ('MEX', 'Mexico',            'México',           '🇲🇽', 'A'),
  -- CONMEBOL
  ('ARG', 'Argentina',         'Argentina',        '🇦🇷', 'C'),
  ('BRA', 'Brazil',            'Brasil',           '🇧🇷', 'D'),
  ('URU', 'Uruguay',           'Uruguay',          '🇺🇾', 'E'),
  ('COL', 'Colombia',          'Colombia',         '🇨🇴', 'F'),
  ('ECU', 'Ecuador',           'Ecuador',          '🇪🇨', 'G'),
  ('PAR', 'Paraguay',          'Paraguay',         '🇵🇾', 'H'),
  ('VEN', 'Venezuela',         'Venezuela',        '🇻🇪', 'I'),
  -- UEFA
  ('ESP', 'Spain',             'España',           '🇪🇸', 'J'),
  ('FRA', 'France',            'Francia',          '🇫🇷', 'K'),
  ('ENG', 'England',           'Inglaterra',       '🏴', 'L'),
  ('GER', 'Germany',           'Alemania',         '🇩🇪', 'A'),
  ('POR', 'Portugal',          'Portugal',         '🇵🇹', 'B'),
  ('NED', 'Netherlands',       'Países Bajos',     '🇳🇱', 'C'),
  ('ITA', 'Italy',             'Italia',           '🇮🇹', 'D'),
  ('BEL', 'Belgium',           'Bélgica',          '🇧🇪', 'E'),
  ('CRO', 'Croatia',           'Croacia',          '🇭🇷', 'F'),
  ('SUI', 'Switzerland',       'Suiza',            '🇨🇭', 'G'),
  ('DEN', 'Denmark',           'Dinamarca',        '🇩🇰', 'H'),
  ('AUT', 'Austria',           'Austria',          '🇦🇹', 'I'),
  ('POL', 'Poland',            'Polonia',          '🇵🇱', 'J'),
  ('TUR', 'Turkey',            'Turquía',          '🇹🇷', 'K'),
  ('SCO', 'Scotland',          'Escocia',          '🏴', 'L'),
  ('NOR', 'Norway',            'Noruega',          '🇳🇴', 'A'),
  -- CAF
  ('MAR', 'Morocco',           'Marruecos',        '🇲🇦', 'B'),
  ('SEN', 'Senegal',           'Senegal',          '🇸🇳', 'C'),
  ('EGY', 'Egypt',             'Egipto',           '🇪🇬', 'D'),
  ('ALG', 'Algeria',           'Argelia',          '🇩🇿', 'E'),
  ('NGA', 'Nigeria',           'Nigeria',          '🇳🇬', 'F'),
  ('TUN', 'Tunisia',           'Túnez',            '🇹🇳', 'G'),
  ('CIV', 'Ivory Coast',       'Costa de Marfil',  '🇨🇮', 'H'),
  ('CMR', 'Cameroon',          'Camerún',          '🇨🇲', 'I'),
  ('GHA', 'Ghana',             'Ghana',            '🇬🇭', 'J'),
  -- AFC
  ('JPN', 'Japan',             'Japón',            '🇯🇵', 'K'),
  ('KOR', 'South Korea',       'Corea del Sur',    '🇰🇷', 'L'),
  ('AUS', 'Australia',         'Australia',        '🇦🇺', 'A'),
  ('IRN', 'Iran',              'Irán',             '🇮🇷', 'B'),
  ('KSA', 'Saudi Arabia',      'Arabia Saudí',     '🇸🇦', 'C'),
  ('QAT', 'Qatar',             'Catar',            '🇶🇦', 'D'),
  ('UZB', 'Uzbekistan',        'Uzbekistán',       '🇺🇿', 'E'),
  ('IRQ', 'Iraq',              'Irak',             '🇮🇶', 'F'),
  ('JOR', 'Jordan',            'Jordania',         '🇯🇴', 'G'),
  -- CONCACAF (other than hosts)
  ('CRC', 'Costa Rica',        'Costa Rica',       '🇨🇷', 'H'),
  ('PAN', 'Panama',            'Panamá',           '🇵🇦', 'I'),
  ('JAM', 'Jamaica',           'Jamaica',          '🇯🇲', 'J'),
  -- OFC
  ('NZL', 'New Zealand',       'Nueva Zelanda',    '🇳🇿', 'K');
