-- ============================================
-- New tables: medications + tips_content
-- ============================================

-- 1) User medications (일반약 + 처방약)
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- 약 이름 (e.g. "이부프로펜", "야즈")
  type TEXT NOT NULL DEFAULT 'otc'   -- 'otc'(일반), 'prescription'(처방), 'supplement'(영양제)
    CHECK (type IN ('otc', 'prescription', 'supplement')),
  form TEXT,                         -- tablet/capsule/patch/liquid/etc
  strength TEXT,                     -- "200mg", "0.02mg/3mg"

  -- 처방약 전용 필드
  hospital TEXT,                     -- 처방 병원명
  doctor TEXT,                       -- 담당의
  prescribed_date DATE,              -- 처방일
  prescription_notes TEXT,           -- 처방전 메모 / 복용 지시사항
  prescription_days INT,             -- 처방 일수 (e.g. 30일분)

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_user ON medications(user_id);

-- 2) Medication intake events (복용 기록)
CREATE TABLE IF NOT EXISTS medication_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,     -- 비정규화: 약 삭제 후에도 기록 유지
  taken_at TIMESTAMPTZ NOT NULL,
  dosage TEXT,                       -- "1정", "2캡슐", "5ml"
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_med_intakes_user_date ON medication_intakes(user_id, taken_at DESC);
CREATE INDEX idx_med_intakes_med ON medication_intakes(medication_id, taken_at DESC);

-- 3) Medication reminder schedules (복용 알림)
CREATE TABLE IF NOT EXISTS medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  times_local TIME[] NOT NULL,       -- {"09:00","21:00"}
  days_of_week SMALLINT[],           -- null=매일, {1,2,3,4,5}=평일
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_trigger_at TIMESTAMPTZ NOT NULL,
  last_trigger_at TIMESTAMPTZ,
  reminder_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_med_schedules_trigger ON medication_schedules(next_trigger_at)
  WHERE enabled = true;
CREATE INDEX idx_med_schedules_user ON medication_schedules(user_id);

-- 4) Curated health tips (큐레이션 건강 팁)
CREATE TABLE IF NOT EXISTS tips_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL DEFAULT 'ko-KR',
  phase TEXT NOT NULL                -- 'menstrual'|'follicular'|'ovulation'|'luteal'|'any'
    CHECK (phase IN ('menstrual', 'follicular', 'ovulation', 'luteal', 'any')),
  category TEXT NOT NULL             -- 영양/운동/정신건강/피부/일반
    CHECK (category IN ('nutrition', 'exercise', 'mental', 'skincare', 'wellness')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT DEFAULT '💡',
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight INT NOT NULL DEFAULT 100,   -- 노출 가중치
  published BOOLEAN NOT NULL DEFAULT false,
  active_from DATE,
  active_to DATE,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tips_published ON tips_content(published, locale, phase, category);

-- ============================================
-- RLS Policies
-- ============================================

-- Medications: 본인만 접근
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meds_select_own" ON medications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "meds_insert_own" ON medications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meds_update_own" ON medications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "meds_delete_own" ON medications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Medication intakes: 본인만 접근
ALTER TABLE medication_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_intakes_select_own" ON medication_intakes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "med_intakes_insert_own" ON medication_intakes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "med_intakes_update_own" ON medication_intakes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "med_intakes_delete_own" ON medication_intakes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Medication schedules: 본인만 접근
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_schedules_select_own" ON medication_schedules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "med_schedules_insert_own" ON medication_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "med_schedules_update_own" ON medication_schedules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "med_schedules_delete_own" ON medication_schedules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tips: 인증 사용자 읽기만 허용 (관리는 서비스 역할)
ALTER TABLE tips_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_select_published" ON tips_content
  FOR SELECT TO authenticated USING (published = true);
