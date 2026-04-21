-- ============================================================
-- SmartSports – Seed Roles
-- Migration: 003_seed_roles.sql
-- ============================================================

-- Insert the default roles if they don't already exist
INSERT INTO roles (name) VALUES ('Player') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('PitchOwner') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('Admin') ON CONFLICT (name) DO NOTHING;