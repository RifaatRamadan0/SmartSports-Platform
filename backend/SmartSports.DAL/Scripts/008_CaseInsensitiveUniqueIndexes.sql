-- Replace case-sensitive unique constraints on email and username with
-- case-insensitive functional unique indexes so that 'John@x.com' and
-- 'john@x.com' are treated as the same address at the database level.

ALTER TABLE users DROP CONSTRAINT users_email_key;
ALTER TABLE users DROP CONSTRAINT users_username_key;

CREATE UNIQUE INDEX users_email_lower_idx    ON users (LOWER(email));
CREATE UNIQUE INDEX users_username_lower_idx ON users (LOWER(username));
