-- Add prediction_months column to user_settings
-- Controls how many future cycles to predict (1-5, default 3)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS prediction_months INTEGER DEFAULT 3;

-- Ensure valid range
ALTER TABLE user_settings
  ADD CONSTRAINT prediction_months_range CHECK (prediction_months >= 1 AND prediction_months <= 5);
