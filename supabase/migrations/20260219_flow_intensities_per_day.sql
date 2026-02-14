-- ============================================
-- Add per-day flow intensity tracking
-- ============================================
-- Previously flow_intensity was stored per-period (single value),
-- meaning changing flow on one day changed it for ALL days in that period.
-- This migration adds a JSONB column to store per-day flow intensities:
--   flow_intensities: { "2026-02-14": "heavy", "2026-02-15": "light" }
-- The existing flow_intensity column is kept as fallback/default.

ALTER TABLE periods
  ADD COLUMN IF NOT EXISTS flow_intensities JSONB DEFAULT '{}';

-- Migrate existing data: if flow_intensity is set, copy it to start_date key
UPDATE periods
SET flow_intensities = jsonb_build_object(start_date::text, flow_intensity)
WHERE flow_intensity IS NOT NULL
  AND (flow_intensities IS NULL OR flow_intensities = '{}');
