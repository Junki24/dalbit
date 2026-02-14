// Database types
export interface Period {
  id: string
  user_id: string
  start_date: string // YYYY-MM-DD
  end_date: string | null
  flow_intensity: FlowIntensity | null
  created_at: string
  updated_at: string
  deleted_at: string | null // soft delete - null이면 활성 기록
}

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy'

export interface Symptom {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  symptom_type: SymptomType
  severity: 1 | 2 | 3 | 4 | 5
  notes: string | null
  created_at: string
}

export type SymptomType =
  | 'cramps' | 'headache' | 'backache' | 'bloating'
  | 'fatigue' | 'nausea' | 'breast_tenderness'
  | 'mood_happy' | 'mood_sad' | 'mood_irritable' | 'mood_anxious' | 'mood_calm'
  | 'acne' | 'insomnia' | 'cravings'

export interface UserSettings {
  user_id: string
  display_name: string | null
  average_cycle_length: number
  average_period_length: number
  notifications_enabled: boolean
  health_data_consent: boolean
  consent_date: string | null
  created_at: string
  updated_at: string
}

export interface PartnerSharing {
  id: string
  owner_id: string
  partner_user_id: string | null
  invite_code: string
  invite_expires_at: string
  permission_level: 'read'
  accepted: boolean
  created_at: string
}

// Cycle prediction
export interface CyclePrediction {
  nextPeriodDate: Date
  ovulationDate: Date
  fertileWindowStart: Date
  fertileWindowEnd: Date
  confidence: 'low' | 'medium' | 'high'
  averageCycleLength: number
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface CyclePhaseInfo {
  phase: CyclePhase
  phaseKo: string
  description: string
  partnerTip: string
  color: string
}

// Calendar
export interface CalendarDay {
  date: Date
  dateStr: string // YYYY-MM-DD
  isPeriod: boolean
  isPredictedPeriod: boolean
  isFertile: boolean
  isOvulation: boolean
  isToday: boolean
  isCurrentMonth: boolean
  symptoms: Symptom[]
  flowIntensity: FlowIntensity | null
}

// Labels
export const SYMPTOM_LABELS: Record<SymptomType, string> = {
  cramps: '복통/생리통',
  headache: '두통',
  backache: '허리 통증',
  bloating: '복부 팽만',
  fatigue: '피로',
  nausea: '메스꺼움',
  breast_tenderness: '가슴 통증',
  mood_happy: '행복',
  mood_sad: '우울',
  mood_irritable: '짜증',
  mood_anxious: '불안',
  mood_calm: '평온',
  acne: '피부 트러블',
  insomnia: '불면',
  cravings: '식욕 변화',
}

export const SYMPTOM_ICONS: Record<SymptomType, string> = {
  cramps: '🤕',
  headache: '😣',
  backache: '💆',
  bloating: '😮‍💨',
  fatigue: '😴',
  nausea: '🤢',
  breast_tenderness: '😖',
  mood_happy: '😊',
  mood_sad: '😢',
  mood_irritable: '😤',
  mood_anxious: '😰',
  mood_calm: '😌',
  acne: '😓',
  insomnia: '🌙',
  cravings: '🍫',
}

export const FLOW_LABELS: Record<FlowIntensity, string> = {
  spotting: '소량',
  light: '적음',
  medium: '보통',
  heavy: '많음',
}

export const FLOW_COLORS: Record<FlowIntensity, string> = {
  spotting: '#fda4af',
  light: '#fb7185',
  medium: '#f43f5e',
  heavy: '#e11d48',
}
