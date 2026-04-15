-- ============================================================
-- SmartSports – Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ----------------------------------------------------------------
-- Reference / lookup tables
-- ----------------------------------------------------------------

CREATE TABLE regions (
    id    SERIAL PRIMARY KEY,
    name  TEXT   NOT NULL UNIQUE
);

CREATE TABLE cities (
    id         SERIAL PRIMARY KEY,
    name       TEXT   NOT NULL,
    region_id  INT    NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
    UNIQUE (name, region_id)
);

CREATE TABLE sport_types (
    id    SERIAL PRIMARY KEY,
    name  TEXT   NOT NULL UNIQUE
);

-- ----------------------------------------------------------------
-- Users & Roles
-- ----------------------------------------------------------------

CREATE TABLE roles (
    id    SERIAL PRIMARY KEY,
    name  TEXT   NOT NULL UNIQUE   -- 'player', 'owner', 'admin'
);

CREATE TABLE users (
    id                  SERIAL        PRIMARY KEY,
    username            TEXT          NOT NULL UNIQUE,
    email               TEXT          NOT NULL UNIQUE,
    password_hash       TEXT          NOT NULL,
    phone_number        TEXT          UNIQUE,
    profile_picture     TEXT,
    skill_level         SMALLINT      CHECK (skill_level BETWEEN 1 AND 4),
                                      -- 1 Beginner | 2 Intermediate | 3 Advanced | 4 Pro
    preferred_position  TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Composite PK exactly as specified in proposal Section 7.1
CREATE TABLE user_roles (
    user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ----------------------------------------------------------------
-- Pitches
-- ----------------------------------------------------------------

CREATE TABLE pitches (
    id              SERIAL          PRIMARY KEY,
    owner_id        INT             NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    city_id         INT             NOT NULL REFERENCES cities(id)      ON DELETE RESTRICT,
    sport_type_id   INT             NOT NULL REFERENCES sport_types(id) ON DELETE RESTRICT,
    name            TEXT            NOT NULL,
    address         TEXT            NOT NULL,
    price_per_hour  NUMERIC(10,2)   NOT NULL,
    rating          NUMERIC(3,2),   -- computed/updated by app layer
    latitude        NUMERIC(9,6),
    longitude       NUMERIC(9,6),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_approved     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pitch_price CHECK (price_per_hour > 0)
);

CREATE TABLE pitch_images (
    id        SERIAL   PRIMARY KEY,
    pitch_id  INT      NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
    image_url TEXT     NOT NULL
);

CREATE TABLE pitch_weekly_schedules (
    id           SERIAL   PRIMARY KEY,
    pitch_id     INT      NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
    day_of_week  SMALLINT NOT NULL,
    open_time    TIME     NOT NULL,
    close_time   TIME     NOT NULL,
    is_active    BOOLEAN  NOT NULL DEFAULT TRUE,
    UNIQUE (pitch_id, day_of_week),
    CONSTRAINT chk_schedule_day   CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT chk_schedule_times CHECK (open_time < close_time)
);

-- ----------------------------------------------------------------
-- Bookings
-- ----------------------------------------------------------------

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE bookings (
    id            SERIAL          PRIMARY KEY,
    user_id       INT             NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
    pitch_id      INT             NOT NULL REFERENCES pitches(id) ON DELETE RESTRICT,
    booking_date  DATE            NOT NULL,
    start_time    TIME            NOT NULL,
    end_time      TIME            NOT NULL,
    booked_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    total_price  NUMERIC(10,2)  NOT NULL,
    status        booking_status  NOT NULL DEFAULT 'pending',
    UNIQUE (pitch_id, booking_date, start_time),   -- double-booking prevention
    CONSTRAINT chk_booking_price CHECK (total_price >= 0),
    CONSTRAINT chk_booking_times CHECK (start_time < end_time)
);

-- ----------------------------------------------------------------
-- Matches
-- ----------------------------------------------------------------

-- Match is exactly what the ERD shows: thin table linked 1-to-1 to Booking
CREATE TABLE matches (
    id              SERIAL   PRIMARY KEY,
    booking_id      INT      NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    is_open_to_join BOOLEAN  NOT NULL DEFAULT TRUE,
    max_players     INT      NOT NULL,
    CONSTRAINT chk_match_maxplayers CHECK (max_players > 0)
);

CREATE TYPE participant_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE match_participants (
    id                    SERIAL             PRIMARY KEY,
    match_id              INT                NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id               INT                NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    status                participant_status NOT NULL DEFAULT 'pending',
    attendance_confirmed  BOOLEAN            NOT NULL DEFAULT FALSE,
    UNIQUE (match_id, user_id)
);

-- ----------------------------------------------------------------
-- Social & Communication
-- ----------------------------------------------------------------

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE invitations (
    id               SERIAL            PRIMARY KEY,
    match_id         INT               NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    invited_by_id    INT               NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    invited_user_id  INT               REFERENCES users(id)            ON DELETE SET NULL,  -- nullable: shareable link
    expires_at       TIMESTAMPTZ,
    token            TEXT              NOT NULL UNIQUE,
    status           invitation_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE chat_messages (
    id         SERIAL      PRIMARY KEY,
    match_id   INT         NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id  INT         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    pitch_id    INT         NOT NULL REFERENCES pitches(id)  ON DELETE CASCADE,
    booking_id  INT         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL,
    comment     TEXT,       -- nullable per proposal
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, booking_id),   -- one review per booking per user
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TYPE notification_type AS ENUM (
    'booking_confirmed',
    'booking_cancelled',
    'match_invitation',
    'match_joined',
    'match_cancelled',
    'review_received'
);

CREATE TABLE notifications (
    id                 SERIAL            PRIMARY KEY,
    user_id            INT               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_entity_id  INT,              -- nullable per proposal
    message            TEXT              NOT NULL,
    type               notification_type NOT NULL,
    is_read            BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------

CREATE INDEX idx_cities_region          ON cities(region_id);
CREATE INDEX idx_pitches_owner          ON pitches(owner_id);
CREATE INDEX idx_pitches_city           ON pitches(city_id);
CREATE INDEX idx_pitches_sport          ON pitches(sport_type_id);
CREATE INDEX idx_pitches_location       ON pitches(latitude, longitude);
CREATE INDEX idx_bookings_pitch_date    ON bookings(pitch_id, booking_date);
CREATE INDEX idx_bookings_user          ON bookings(user_id);
CREATE INDEX idx_matches_booking        ON matches(booking_id);
CREATE INDEX idx_participants_match     ON match_participants(match_id);
CREATE INDEX idx_participants_user      ON match_participants(user_id);
CREATE INDEX idx_invitations_match      ON invitations(match_id);
CREATE INDEX idx_invitations_token      ON invitations(token);
CREATE INDEX idx_chat_messages_match    ON chat_messages(match_id);
CREATE INDEX idx_notifications_user     ON notifications(user_id);
CREATE INDEX idx_notifications_unread   ON notifications(user_id) WHERE is_read = FALSE;