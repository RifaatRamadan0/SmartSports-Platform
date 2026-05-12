-- Backfill existing phone_number values to E.164 (+961XXXXXXXX) so they
-- collide with newly registered numbers under the canonical format.
--
-- Strategy:
--   1. Strip whitespace and common delimiters ( . - ( ) + ).
--   2. If the result starts with 961, prefix '+'.
--   3. Else if it starts with 0, drop the 0 and prefix '+961'.
--   4. Else prefix '+961' (bare 70-series mobile numbers).
--
-- Rows whose normalized value would collide with an existing canonical row
-- are deleted first (they are unreachable duplicates of the same person).

WITH normalized AS (
    SELECT
        id,
        phone_number AS original,
        CASE
            WHEN regexp_replace(phone_number, '[\s\-().+]+', '', 'g') LIKE '961%'
                THEN '+' || regexp_replace(phone_number, '[\s\-().+]+', '', 'g')
            WHEN regexp_replace(phone_number, '[\s\-().+]+', '', 'g') LIKE '0%'
                THEN '+961' || substring(regexp_replace(phone_number, '[\s\-().+]+', '', 'g') FROM 2)
            ELSE '+961' || regexp_replace(phone_number, '[\s\-().+]+', '', 'g')
        END AS canonical
    FROM users
),
ranked AS (
    SELECT id, canonical,
           ROW_NUMBER() OVER (PARTITION BY canonical ORDER BY id) AS rn
    FROM normalized
)
DELETE FROM users
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE users u
SET phone_number = n.canonical
FROM (
    SELECT
        id,
        CASE
            WHEN regexp_replace(phone_number, '[\s\-().+]+', '', 'g') LIKE '961%'
                THEN '+' || regexp_replace(phone_number, '[\s\-().+]+', '', 'g')
            WHEN regexp_replace(phone_number, '[\s\-().+]+', '', 'g') LIKE '0%'
                THEN '+961' || substring(regexp_replace(phone_number, '[\s\-().+]+', '', 'g') FROM 2)
            ELSE '+961' || regexp_replace(phone_number, '[\s\-().+]+', '', 'g')
        END AS canonical
    FROM users
) n
WHERE u.id = n.id
  AND u.phone_number <> n.canonical;
