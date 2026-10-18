-- Demo data for the public live demo: the three accounts shown on the login page
-- (password Demo1234!), four pitches owned by demo_owner and a few bookings (each with its
-- match) by demo_player.
-- Idempotent: every insert is guarded, so databases that already have some of this data
-- (e.g. a local DB where the demo users were created by hand) skip it instead of failing.
-- Cities and sports are looked up by name and booking dates are relative to the run date.

-- Users (ids 1-3 on a fresh database)
INSERT INTO users (username, email, password_hash, phone_number, is_email_verified, is_phone_verified)
VALUES
    ('demo_player', 'demo_player@example.com', '$2a$11$42VapxeZTEEVkO9F9NFLwOzkofKnrX3vkJtYwv5P0GXmvC/RAVWjC', '+96170000001', TRUE, TRUE),
    ('demo_owner',  'demo_owner@example.com',  '$2a$11$p2eq8TLqotRTAJPECtRqwufHq9hbBV3iEN42crbSyHpF5SQKcIure', '+96170000002', TRUE, TRUE),
    ('demo_admin',  'demo_admin@example.com',  '$2a$11$AC3Ow0Y7LsoZsRESF9wYgeQNuqFpqeDyWBkB62149PMXwP4ZTJT82', '+96170000003', TRUE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES ('demo_player', 'Player'),
             ('demo_owner',  'PitchOwner'),
             ('demo_admin',  'Admin')) AS d(username, role)
JOIN users u ON LOWER(u.username) = d.username
JOIN roles r ON r.name = d.role
ON CONFLICT DO NOTHING;

-- Pitches owned by demo_owner, approved and active
INSERT INTO pitches (owner_id, city_id, sport_type_id, name, address, price_per_hour,
                     latitude, longitude, is_active, max_booking_duration_minutes, status, capacity)
SELECT o.id,
       (SELECT id FROM cities      WHERE name = d.city  ORDER BY id LIMIT 1),
       (SELECT id FROM sport_types WHERE name = d.sport ORDER BY id LIMIT 1),
       d.name, d.address, d.price, d.lat, d.lng, TRUE, d.max_minutes, 1, d.capacity
FROM (VALUES
        (1, 'Verdun Five-a-Side Arena', 'Verdun Street, Verdun, Beirut', 'Beirut',  'Football', 30.00, 33.884000, 35.483000, 120, 10),
        (2, 'Raouche Padel Club',       'General de Gaulle Avenue, Raouche, Beirut', 'Beirut', 'Padel', 35.00, 33.889000, 35.472000, 60, 4),
        (3, 'Adma Tennis Courts',       'Adma Main Road, Adma, Jounieh', 'Jounieh', 'Tennis',   40.00, 34.006000, 35.629000, 60, 4),
        (4, 'Hazmieh Basketball Court', 'Damascus Road, Hazmieh, Baabda', 'Baabda', 'Basketball', 25.00, 33.855000, 35.539000, 120, 10)
     ) AS d(ord, name, address, city, sport, price, lat, lng, max_minutes, capacity)
JOIN users o ON o.username = 'demo_owner'
WHERE NOT EXISTS (SELECT 1 FROM pitches p WHERE p.owner_id = o.id AND p.name = d.name)
ORDER BY d.ord;

-- Open every day 08:00-23:00 (day_of_week 0 = Sunday)
INSERT INTO pitch_weekly_schedules (pitch_id, day_of_week, open_time, close_time, is_active)
SELECT p.id, d.day, TIME '08:00', TIME '23:00', TRUE
FROM pitches p
JOIN users o ON o.id = p.owner_id AND o.username = 'demo_owner'
CROSS JOIN generate_series(0, 6) AS d(day)
WHERE p.deleted_at IS NULL
ORDER BY p.id, d.day
ON CONFLICT (pitch_id, day_of_week) DO NOTHING;

-- Photos hosted on ImageKit, only for demo pitches that have none yet
INSERT INTO pitch_images (pitch_id, image_url, is_cover, display_order)
SELECT p.id, ph.url, ph.n = 1, ph.n - 1
FROM pitches p
JOIN users o ON o.id = p.owner_id AND o.username = 'demo_owner'
JOIN (VALUES
        ('Verdun Five-a-Side Arena', 1, 'https://ik.imagekit.io/smartsports/smartsports/pitches/football-4.jpg'),
        ('Verdun Five-a-Side Arena', 2, 'https://ik.imagekit.io/smartsports/smartsports/pitches/football-1.jpg'),
        ('Verdun Five-a-Side Arena', 3, 'https://ik.imagekit.io/smartsports/smartsports/pitches/football-2.jpg'),
        ('Verdun Five-a-Side Arena', 4, 'https://ik.imagekit.io/smartsports/smartsports/pitches/football-3.jpg'),
        ('Raouche Padel Club',       1, 'https://ik.imagekit.io/smartsports/smartsports/pitches/padel-1.jpg'),
        ('Raouche Padel Club',       2, 'https://ik.imagekit.io/smartsports/smartsports/pitches/padel-2.jpg'),
        ('Raouche Padel Club',       3, 'https://ik.imagekit.io/smartsports/smartsports/pitches/padel-3.jpg'),
        ('Adma Tennis Courts',       1, 'https://ik.imagekit.io/smartsports/smartsports/pitches/tennis-1.jpg'),
        ('Adma Tennis Courts',       2, 'https://ik.imagekit.io/smartsports/smartsports/pitches/tennis-2.jpg'),
        ('Adma Tennis Courts',       3, 'https://ik.imagekit.io/smartsports/smartsports/pitches/tennis-3.jpg'),
        ('Hazmieh Basketball Court', 1, 'https://ik.imagekit.io/smartsports/smartsports/pitches/basketball-1.jpg'),
        ('Hazmieh Basketball Court', 2, 'https://ik.imagekit.io/smartsports/smartsports/pitches/basketball-2.jpg'),
        ('Hazmieh Basketball Court', 3, 'https://ik.imagekit.io/smartsports/smartsports/pitches/basketball-3.jpg')
     ) AS ph(pitch_name, n, url) ON ph.pitch_name = p.name
WHERE NOT EXISTS (SELECT 1 FROM pitch_images i WHERE i.pitch_id = p.id)
ORDER BY p.id, ph.n;

-- demo_player's bookings: one past, two upcoming (one per pitch, skipped if one exists)
INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, total_price, status)
SELECT pl.id, p.id, CURRENT_DATE + d.day_offset, d.start_time, d.end_time, d.price,
       'confirmed'::booking_status
FROM (VALUES
        ('Adma Tennis Courts',       -12, TIME '10:00', TIME '11:00', 40.00),
        ('Raouche Padel Club',         9, TIME '19:00', TIME '20:00', 35.00),
        ('Verdun Five-a-Side Arena',  16, TIME '18:00', TIME '19:30', 45.00)
     ) AS d(pitch_name, day_offset, start_time, end_time, price)
JOIN users pl ON pl.username = 'demo_player'
JOIN users o  ON o.username  = 'demo_owner'
JOIN pitches p ON p.owner_id = o.id AND p.name = d.pitch_name
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = pl.id AND b.pitch_id = p.id)
ORDER BY d.day_offset;

-- One match per booking, as BookingRepository.CreateWithMatchAsync does for real bookings.
-- Open to join so the upcoming ones appear in Find a Game.
INSERT INTO matches (booking_id, is_open_to_join, max_players)
SELECT b.id, TRUE, p.capacity
FROM bookings b
JOIN users pl  ON pl.id = b.user_id AND pl.username = 'demo_player'
JOIN pitches p ON p.id = b.pitch_id
ORDER BY b.id
ON CONFLICT (booking_id) DO NOTHING;
