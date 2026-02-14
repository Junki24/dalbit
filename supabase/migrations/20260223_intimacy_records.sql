-- 관계 기록 (Intimacy Records)
CREATE TABLE IF NOT EXISTS intimacy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  protection_used BOOLEAN,
  protection_method TEXT CHECK (protection_method IN ('condom', 'pill', 'iud', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, time_of_day)
);

CREATE INDEX idx_intimacy_user_date ON intimacy_records(user_id, date);

-- RLS
ALTER TABLE intimacy_records ENABLE ROW LEVEL SECURITY;

-- 본인 CRUD + 파트너 읽기 (기본 공유)
CREATE POLICY "intimacy_select_own_or_partner" ON intimacy_records
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM partner_sharing
      WHERE partner_user_id = auth.uid() AND accepted = true
    )
  );

CREATE POLICY "intimacy_insert_own" ON intimacy_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "intimacy_update_own" ON intimacy_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "intimacy_delete_own" ON intimacy_records
  FOR DELETE USING (auth.uid() = user_id);
