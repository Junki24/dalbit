-- ============================================
-- 제품 추천 설문 (Pad Preferences)
-- ============================================

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

-- RLS: 본인 데이터만 접근 + 파트너 읽기 허용
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
