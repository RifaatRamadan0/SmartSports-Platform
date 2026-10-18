-- ============================================================
-- SmartSports – Seed lookup data (Lebanon)
-- Migration: 015_SeedLebaneseRegionsAndCities.sql
-- Idempotent: relies on UNIQUE (name) on regions / sport_types
--             and UNIQUE (name, region_id) on cities.
-- ============================================================

-- ----------------------------------------------------------------
-- Regions (Lebanese governorates)
-- ----------------------------------------------------------------
INSERT INTO regions (name) VALUES
    ('Beirut'),
    ('Mount Lebanon'),
    ('North'),
    ('Akkar'),
    ('Bekaa'),
    ('Baalbek-Hermel'),
    ('South'),
    ('Nabatieh')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------
-- Cities (resolved by region name to avoid hard-coded ids)
-- ----------------------------------------------------------------
INSERT INTO cities (name, region_id)
SELECT v.name, r.id
FROM (VALUES
    -- Beirut
    ('Beirut',        'Beirut'),

    -- Mount Lebanon
    ('Jounieh',       'Mount Lebanon'),
    ('Baabda',        'Mount Lebanon'),
    ('Aley',          'Mount Lebanon'),
    ('Jbeil',         'Mount Lebanon'),
    ('Broummana',     'Mount Lebanon'),
    ('Beit Mery',     'Mount Lebanon'),
    ('Bikfaya',       'Mount Lebanon'),

    -- North
    ('Tripoli',       'North'),
    ('Batroun',       'North'),
    ('Zgharta',       'North'),
    ('Koura',         'North'),
    ('Bcharre',       'North'),
    ('Miniyeh',       'North'),

    -- Akkar
    ('Halba',         'Akkar'),

    -- Bekaa
    ('Zahle',         'Bekaa'),
    ('Chtaura',       'Bekaa'),
    ('Anjar',         'Bekaa'),
    ('Rachaya',       'Bekaa'),

    -- Baalbek-Hermel
    ('Baalbek',       'Baalbek-Hermel'),
    ('Hermel',        'Baalbek-Hermel'),

    -- South
    ('Saida',         'South'),
    ('Tyre',          'South'),
    ('Jezzine',       'South'),

    -- Nabatieh
    ('Nabatieh',      'Nabatieh'),
    ('Bint Jbeil',    'Nabatieh'),
    ('Marjayoun',     'Nabatieh'),
    ('Hasbaya',       'Nabatieh')
) AS v(name, region_name)
JOIN regions r ON r.name = v.region_name
ON CONFLICT (name, region_id) DO NOTHING;

-- ----------------------------------------------------------------
-- Sport types
-- ----------------------------------------------------------------
INSERT INTO sport_types (name) VALUES
    ('Football'),
    ('Basketball'),
    ('Tennis'),
    ('Volleyball'),
    ('Padel')
ON CONFLICT (name) DO NOTHING;
