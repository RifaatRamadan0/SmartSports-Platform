-- Remove users without a phone number then enforce NOT NULL on the column.
DELETE FROM users WHERE phone_number IS NULL;

ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;
