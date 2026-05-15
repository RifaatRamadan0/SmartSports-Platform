-- Adds cover-image flag, ordering, and timestamps to pitch_images.
-- Cover is optional; the partial unique index permits zero covers per pitch
-- but at most one row with is_cover = TRUE.

ALTER TABLE pitch_images
    ADD COLUMN is_cover      BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN display_order INT         NOT NULL DEFAULT 0,
    ADD COLUMN created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX ux_pitch_images_cover
    ON pitch_images (pitch_id)
    WHERE is_cover = TRUE;

CREATE INDEX ix_pitch_images_pitch_id_order
    ON pitch_images (pitch_id, display_order, id);
