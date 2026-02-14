-- Add gender column for male/female user modes
-- female: full cycle tracking (default, backward compatible)
-- male: partner-only view via invite link
ALTER TABLE user_settings ADD COLUMN gender TEXT NOT NULL DEFAULT 'female';
