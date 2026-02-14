-- ============================================
-- 달빛 (Dalbit) - Supabase Database Schema
-- ============================================
-- Supabase SQL Editor에서 이 스크립트를 실행하세요.
-- https://supabase.com/dashboard > SQL Editor

-- 1. Periods (생리 기록)
CREATE TABLE IF NOT EXISTS periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  flow_intensity TEXT CHECK (flow_intensity IN ('spotting', 'light', 'medium', 'heavy')),
  flow_intensities JSONB DEFAULT '{}', -- per-day: { "2026-02-14": "heavy" }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, start_date)
);

CREATE INDEX idx_periods_user_id ON periods(user_id);
CREATE INDEX idx_periods_start_date ON periods(start_date DESC);

-- 2. Symptoms (증상 기록)
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  symptom_type TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5) DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_symptoms_user_id ON symptoms(user_id);
CREATE INDEX idx_symptoms_user_date ON symptoms(user_id, date);

-- 3. User Settings (사용자 설정)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  average_cycle_length INTEGER DEFAULT 28,
  average_period_length INTEGER DEFAULT 5,
  notifications_enabled BOOLEAN DEFAULT true,
  health_data_consent BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Partner Sharing (파트너 공유)
CREATE TABLE IF NOT EXISTS partner_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  permission_level TEXT DEFAULT 'read' CHECK (permission_level IN ('read')),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partner_sharing_owner ON partner_sharing(owner_id);
CREATE INDEX idx_partner_sharing_partner ON partner_sharing(partner_user_id);
CREATE INDEX idx_partner_sharing_code ON partner_sharing(invite_code);

-- 5. Daily Notes (일일 메모)
CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_notes_user_date ON daily_notes(user_id, date);

-- 6. Pad Preferences (제품 추천 설문)
CREATE TABLE IF NOT EXISTS pad_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  product_types TEXT[] DEFAULT '{}',
  brand TEXT,
  product_name TEXT,
  sizes TEXT[] DEFAULT '{}',
  skin_sensitivity TEXT DEFAULT 'normal' CHECK (skin_sensitivity IN ('sensitive', 'normal', 'not_concerned')),
  priority TEXT DEFAULT 'comfort' CHECK (priority IN ('absorption', 'comfort', 'cotton', 'price', 'eco')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pad_preferences_user ON pad_preferences(user_id);

-- periods 테이블에 deleted_at 컬럼 추가 (soft delete)
ALTER TABLE periods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_sharing ENABLE ROW LEVEL SECURITY;

-- Periods: 본인 데이터만 접근 + 파트너 읽기 허용
CREATE POLICY "periods_select_own" ON periods
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE partner_user_id = auth.uid() AND accepted = true
    )
  );

CREATE POLICY "periods_insert_own" ON periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "periods_update_own" ON periods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "periods_delete_own" ON periods
  FOR DELETE USING (auth.uid() = user_id);

-- Symptoms: 본인 데이터만 접근 + 파트너 읽기 허용
CREATE POLICY "symptoms_select_own" ON symptoms
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE partner_user_id = auth.uid() AND accepted = true
    )
  );

CREATE POLICY "symptoms_insert_own" ON symptoms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "symptoms_update_own" ON symptoms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "symptoms_delete_own" ON symptoms
  FOR DELETE USING (auth.uid() = user_id);

-- User Settings: 본인만 접근
CREATE POLICY "settings_select_own" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_own" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_own" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Partner Sharing: 본인이 생성/관리
CREATE POLICY "sharing_select" ON partner_sharing
  FOR SELECT USING (
    auth.uid() = owner_id OR auth.uid() = partner_user_id
  );

CREATE POLICY "sharing_insert" ON partner_sharing
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "sharing_update" ON partner_sharing
  FOR UPDATE USING (
    auth.uid() = owner_id OR auth.uid() = partner_user_id
  );

CREATE POLICY "sharing_delete" ON partner_sharing
  FOR DELETE USING (auth.uid() = owner_id);

-- Daily Notes: 본인만 접근
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own" ON daily_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own" ON daily_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own" ON daily_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notes_delete_own" ON daily_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Pad Preferences: 본인만 접근 + 파트너 읽기 허용
ALTER TABLE pad_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pad_prefs_select" ON pad_preferences
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE partner_user_id = auth.uid() AND accepted = true
    )
  );

CREATE POLICY "pad_prefs_insert" ON pad_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pad_prefs_update" ON pad_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "pad_prefs_delete" ON pad_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 완료! Supabase Auth에서 Google OAuth를 활성화하세요.
-- Authentication > Providers > Google
-- ============================================
