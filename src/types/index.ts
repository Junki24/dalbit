// Database types
export interface Period {
  id: string
  user_id: string
  start_date: string // YYYY-MM-DD
  end_date: string | null
  flow_intensity: FlowIntensity | null // legacy: per-period default
  flow_intensities: Record<string, FlowIntensity> | null // per-day: { "2026-02-14": "heavy" }
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
  gender: 'female' | 'male'
  average_cycle_length: number
  average_period_length: number
  prediction_months: number // 1~5, default 3
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
export interface FutureCycle {
  periodStart: Date
  periodEnd: Date
  ovulationDate: Date
  fertileWindowStart: Date
  fertileWindowEnd: Date
}

export interface CyclePrediction {
  nextPeriodDate: Date
  ovulationDate: Date
  fertileWindowStart: Date
  fertileWindowEnd: Date
  confidence: 'low' | 'medium' | 'high'
  averageCycleLength: number
  futureCycles: FutureCycle[]
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
  hasIntimacy: boolean
}

// Pad Preferences (제품 추천 설문)
export interface PadPreferences {
  id: string
  user_id: string
  product_types: ProductType[]
  brand: string | null        // 주로 사용하던 브랜드
  product_name: string | null // 주로 사용하던 상품명 (자유입력)
  sizes: PadSize[]
  skin_sensitivity: SkinSensitivity
  priority: ComfortPriority
  created_at: string
  updated_at: string
}

export type ProductType = 'pad' | 'tampon' | 'cup' | 'liner'
export type PadSize = 'panty_liner' | 'medium' | 'large' | 'overnight'
export type SkinSensitivity = 'sensitive' | 'normal' | 'not_concerned'
export type ComfortPriority = 'absorption' | 'comfort' | 'cotton' | 'price' | 'eco'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  pad: '생리대',
  tampon: '탐폰',
  cup: '생리컵',
  liner: '팬티라이너',
}

export const PRODUCT_TYPE_ICONS: Record<ProductType, string> = {
  pad: '🩹',
  tampon: '🔹',
  cup: '🥤',
  liner: '🌸',
}

export const PAD_SIZE_LABELS: Record<PadSize, string> = {
  panty_liner: '소형 (팬티라이너)',
  medium: '중형',
  large: '대형',
  overnight: '오버나이트',
}

export const SKIN_SENSITIVITY_LABELS: Record<SkinSensitivity, string> = {
  sensitive: '민감해요',
  normal: '보통이에요',
  not_concerned: '신경 안 써요',
}

export const COMFORT_PRIORITY_LABELS: Record<ComfortPriority, string> = {
  absorption: '흡수력',
  comfort: '착용감',
  cotton: '순면 (피부자극↓)',
  price: '가격',
  eco: '친환경',
}

export const BRAND_OPTIONS = [
  '좋은느낌',
  '위스퍼',
  '라엘',
  '오가닉코튼',
  '나트라케어',
  '시크릿데이',
  '바디피트',
  '콜만',
] as const

// Care tips for partners (주기별 파트너 행동요령)
export interface CareTip {
  emoji: string
  title: string
  description: string
}

export const PARTNER_CARE_TIPS: Record<CyclePhase, CareTip[]> = {
  menstrual: [
    { emoji: '💜', title: '예민할 수 있어요', description: '잘 다독여주세요. 작은 배려가 큰 힘이 돼요.' },
    { emoji: '☕', title: '따뜻한 음료 준비', description: '따뜻한 차나 음료를 준비해주세요.' },
    { emoji: '🛋️', title: '편안한 환경', description: '편하게 쉴 수 있도록 배려해주세요.' },
    { emoji: '🍫', title: '간식 챙기기', description: '좋아하는 간식이나 단 것을 준비해주세요.' },
  ],
  follicular: [
    { emoji: '🌱', title: '에너지 회복기', description: '기분이 좋아지는 시기예요. 함께 활동해보세요!' },
    { emoji: '🏃', title: '가벼운 운동', description: '함께 산책이나 운동을 해보는 건 어때요?' },
  ],
  ovulation: [
    { emoji: '✨', title: '컨디션 최고', description: '에너지가 가장 높은 시기예요!' },
    { emoji: '💃', title: '함께 즐기기', description: '데이트나 특별한 활동을 계획해보세요.' },
  ],
  luteal: [
    { emoji: '🫂', title: '감정 기복 주의', description: 'PMS가 올 수 있어요. 이해하고 공감해주세요.' },
    { emoji: '🍫', title: '단 것이 당겨요', description: '좋아하는 간식을 미리 준비해두면 좋아요.' },
    { emoji: '😴', title: '피로감 증가', description: '평소보다 피곤할 수 있어요. 무리하지 않게 해주세요.' },
  ],
}

// Medication (약 복용 기록)
export type MedicationType = 'otc' | 'prescription' | 'supplement'

export interface Medication {
  id: string
  user_id: string
  name: string
  type: MedicationType
  form: string | null       // tablet/capsule/patch/liquid
  strength: string | null   // "200mg"
  // 처방약 전용
  hospital: string | null
  doctor: string | null
  prescribed_date: string | null
  prescription_notes: string | null
  prescription_days: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MedicationIntake {
  id: string
  user_id: string
  medication_id: string | null
  medication_name: string
  taken_at: string
  dosage: string | null
  note: string | null
  created_at: string
}

export const MEDICATION_TYPE_LABELS: Record<MedicationType, string> = {
  otc: '일반의약품',
  prescription: '처방약',
  supplement: '영양제',
}

export const MEDICATION_TYPE_ICONS: Record<MedicationType, string> = {
  otc: '💊',
  prescription: '🏥',
  supplement: '💚',
}

// Tips (큐레이션 건강 팁)
export type TipCategory = 'nutrition' | 'exercise' | 'mental' | 'skincare' | 'wellness'

export interface TipContent {
  id: string
  locale: string
  phase: CyclePhase | 'any'
  category: TipCategory
  title: string
  body: string
  emoji: string
  tags: string[]
  weight: number
  published: boolean
  active_from: string | null
  active_to: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  nutrition: '영양',
  exercise: '운동',
  mental: '마음',
  skincare: '피부',
  wellness: '건강',
}

export const TIP_CATEGORY_ICONS: Record<TipCategory, string> = {
  nutrition: '🥗',
  exercise: '🏃',
  mental: '🧠',
  skincare: '✨',
  wellness: '💚',
}

// Symptom Pattern Insight (증상 패턴 분석)
export interface SymptomInsight {
  symptomType: SymptomType
  phase: CyclePhase
  probability: number       // 0~1 (해당 주기 단계에서 발생 확률)
  baseline: number          // 0~1 (전체 기간 대비 기준 확률)
  lift: number              // probability / baseline (1.5 이상이면 유의미)
  sampleDays: number        // 분석 표본 일수
  cycleCount: number        // 분석 주기 수
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

// Intimacy (관계 기록)
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type ProtectionMethod = 'condom' | 'pill' | 'iud' | 'other'

export interface IntimacyRecord {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  time_of_day: TimeOfDay | null
  protection_used: boolean | null
  protection_method: ProtectionMethod | null
  note: string | null
  created_at: string
  updated_at: string
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: '아침',
  afternoon: '낮',
  evening: '저녁',
  night: '밤',
}

export const TIME_OF_DAY_ICONS: Record<TimeOfDay, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌇',
  night: '🌙',
}

export const PROTECTION_METHOD_LABELS: Record<ProtectionMethod, string> = {
  condom: '콘돔',
  pill: '경구피임약',
  iud: 'IUD/루프',
  other: '기타',
}
