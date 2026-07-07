ALTER TABLE pitches ADD COLUMN rating_count INT NOT NULL DEFAULT 0;

UPDATE pitches p SET
    rating       = sub.avg_rating,
    rating_count = sub.cnt
FROM (
    SELECT pitch_id,
           AVG(rating)::numeric(3,2) AS avg_rating,
           COUNT(*)                  AS cnt
    FROM   reviews
    GROUP  BY pitch_id
) sub
WHERE p.id = sub.pitch_id;
