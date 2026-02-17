-- Add pregnancy_mode column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pregnancy_mode BOOLEAN NOT NULL DEFAULT false;
