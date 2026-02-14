import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '@/lib/store'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { isDateInPeriod } from '@/lib/cycle'
import {
  SYMPTOM_LABELS,
  SYMPTOM_ICONS,
  FLOW_LABELS,
} from '@/types'
import type { SymptomType, FlowIntensity } from '@/types'
import './RecordPage.css'

const ALL_SYMPTOMS: SymptomType[] = [
  'cramps', 'headache', 'backache', 'bloating',
  'fatigue', 'nausea', 'breast_tenderness',
  'mood_happy', 'mood_sad', 'mood_irritable', 'mood_anxious', 'mood_calm',
  'acne', 'insomnia', 'cravings',
]

const FLOW_OPTIONS: FlowIntensity[] = ['spotting', 'light', 'medium', 'heavy']

export function RecordPage() {
  const selectedDate = useAppStore((s) => s.selectedDate)
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })

  const { periods, addPeriod, updatePeriod, deletePeriod } = usePeriods()
  const { symptoms, addSymptom, deleteSymptom } = useSymptoms(dateStr)

  const existingPeriod = isDateInPeriod(dateStr, periods)
  const [isPeriodActive, setIsPeriodActive] = useState(Boolean(existingPeriod))
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity | null>(
    existingPeriod?.flow_intensity ?? null
  )
  const [notes, setNotes] = useState('')

  // Reset state when date changes
  useEffect(() => {
    const period = isDateInPeriod(dateStr, periods)
    setIsPeriodActive(Boolean(period))
    setFlowIntensity(period?.flow_intensity ?? null)
    setNotes('')
  }, [dateStr, periods])

  const handlePeriodToggle = async () => {
    if (isPeriodActive && existingPeriod) {
      // 삭제 전 확인 다이얼로그 — 기존 데이터 보호
      const confirmed = window.confirm(
        '이 날짜의 생리 기록을 삭제하시겠습니까?\n(데이터는 안전하게 보관되며 복구할 수 있습니다)'
      )
      if (!confirmed) return
      await deletePeriod.mutateAsync(existingPeriod.id)
      setIsPeriodActive(false)
      setFlowIntensity(null)
    } else {
      // Add period
      await addPeriod.mutateAsync({
        start_date: dateStr,
        flow_intensity: flowIntensity,
      })
      setIsPeriodActive(true)
    }
  }

  const handleFlowChange = async (flow: FlowIntensity) => {
    setFlowIntensity(flow)
    if (existingPeriod) {
      await updatePeriod.mutateAsync({
        id: existingPeriod.id,
        flow_intensity: flow,
      })
    }
  }

  const handleSymptomToggle = async (symptomType: SymptomType) => {
    const existing = symptoms.find((s) => s.symptom_type === symptomType)
    if (existing) {
      await deleteSymptom.mutateAsync(existing.id)
    } else {
      await addSymptom.mutateAsync({
        date: dateStr,
        symptom_type: symptomType,
        severity: 3,
      })
    }
  }

  const activeSymptomTypes = new Set(symptoms.map((s) => s.symptom_type))

  // Date navigation
  const goToDate = (offset: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    setSelectedDate(newDate)
  }

  return (
    <div className="record-page">
      {/* Date Selector */}
      <div className="date-selector">
        <button className="date-nav-btn" onClick={() => goToDate(-1)}>‹</button>
        <div className="date-display">
          <span className="date-text">{displayDate}</span>
          <button
            className="date-today-btn"
            onClick={() => setSelectedDate(new Date())}
          >
            오늘
          </button>
        </div>
        <button className="date-nav-btn" onClick={() => goToDate(1)}>›</button>
      </div>

      {/* Period Toggle */}
      <div className="record-section">
        <h3 className="section-title">🩸 생리 기록</h3>
        <button
          className={`period-toggle ${isPeriodActive ? 'period-toggle--active' : ''}`}
          onClick={handlePeriodToggle}
        >
          {isPeriodActive ? '생리 중 ✓' : '생리 시작'}
        </button>

        {/* Flow Intensity */}
        {isPeriodActive && (
          <div className="flow-selector">
            <span className="flow-label">출혈량:</span>
            <div className="flow-options">
              {FLOW_OPTIONS.map((flow) => (
                <button
                  key={flow}
                  className={`flow-btn ${flowIntensity === flow ? 'flow-btn--active' : ''}`}
                  onClick={() => handleFlowChange(flow)}
                >
                  {FLOW_LABELS[flow]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Symptoms */}
      <div className="record-section">
        <h3 className="section-title">📝 증상 기록</h3>

        <div className="symptom-category">
          <h4 className="symptom-category-title">신체 증상</h4>
          <div className="symptom-grid">
            {ALL_SYMPTOMS.filter((s) => !s.startsWith('mood_')).map((type) => (
              <button
                key={type}
                className={`symptom-btn ${activeSymptomTypes.has(type) ? 'symptom-btn--active' : ''}`}
                onClick={() => handleSymptomToggle(type)}
              >
                <span className="symptom-btn-icon">{SYMPTOM_ICONS[type]}</span>
                <span className="symptom-btn-label">{SYMPTOM_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="symptom-category">
          <h4 className="symptom-category-title">기분</h4>
          <div className="symptom-grid">
            {ALL_SYMPTOMS.filter((s) => s.startsWith('mood_')).map((type) => (
              <button
                key={type}
                className={`symptom-btn ${activeSymptomTypes.has(type) ? 'symptom-btn--active' : ''}`}
                onClick={() => handleSymptomToggle(type)}
              >
                <span className="symptom-btn-icon">{SYMPTOM_ICONS[type]}</span>
                <span className="symptom-btn-label">{SYMPTOM_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="record-section">
        <h3 className="section-title">💬 메모</h3>
        <textarea
          className="notes-input"
          placeholder="오늘의 메모를 남겨보세요..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
