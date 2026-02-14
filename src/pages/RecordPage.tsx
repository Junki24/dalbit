import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { format, isToday, differenceInDays, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/contexts/ToastContext'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useNotes } from '@/hooks/useNotes'
import { useHaptic } from '@/hooks/useHaptic'
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

const SEVERITY_LABELS = ['', '약함', '경미', '보통', '강함', '심함'] as const

/** Memo'd symptom button — only re-renders when its active state/severity changes */
const SymptomButton = memo(function SymptomButton({
  type,
  isActive,
  severity,
  onToggle,
  onSeverityToggle,
}: {
  type: SymptomType
  isActive: boolean
  severity: number
  onToggle: (type: SymptomType) => void
  onSeverityToggle: (type: SymptomType) => void
}) {
  return (
    <button
      className={`symptom-btn ${isActive ? 'symptom-btn--active' : ''}`}
      onClick={() => onToggle(type)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (isActive) onSeverityToggle(type)
      }}
    >
      <span className="symptom-btn-icon">{SYMPTOM_ICONS[type]}</span>
      <span className="symptom-btn-label">{SYMPTOM_LABELS[type]}</span>
      {isActive && (
        <span
          className="symptom-severity-badge"
          onClick={(e) => {
            e.stopPropagation()
            onSeverityToggle(type)
          }}
        >
          {severity}
        </span>
      )}
    </button>
  )
})

export function RecordPage() {
  const { confirm } = useToast()
  const { vibrate } = useHaptic()
  const selectedDate = useAppStore((s) => s.selectedDate)
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })

  const { periods, addPeriod, updatePeriod, deletePeriod } = usePeriods()
  const { symptoms, addSymptom, deleteSymptom, updateSymptom } = useSymptoms(dateStr)
  const { note, saveNote, isSaving: isNoteSaving } = useNotes(dateStr)

  const existingPeriod = isDateInPeriod(dateStr, periods)
  const [isPeriodActive, setIsPeriodActive] = useState(Boolean(existingPeriod))
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity | null>(
    existingPeriod?.flow_intensity ?? null
  )
  const [isEndDateMode, setIsEndDateMode] = useState(false)
  const [notes, setNotes] = useState(note ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [selectedSeveritySymptom, setSelectedSeveritySymptom] = useState<SymptomType | null>(null)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when date changes
  useEffect(() => {
    const period = isDateInPeriod(dateStr, periods)
    setIsPeriodActive(Boolean(period))
    setFlowIntensity(period?.flow_intensity ?? null)
    setIsEndDateMode(false)
    setSelectedSeveritySymptom(null)
  }, [dateStr, periods])

  // Sync note from DB when date changes
  useEffect(() => {
    setNotes(note ?? '')
  }, [note])

  // Auto-save notes with debounce
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value)
    setNotesSaved(false)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(async () => {
      await saveNote(value)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }, 1000)
  }, [saveNote])

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    }
  }, [])

  const handlePeriodToggle = async () => {
    if (isPeriodActive && existingPeriod) {
      const confirmed = await confirm({
        title: '기록 삭제',
        message: '이 날짜의 생리 기록을 삭제하시겠습니까?\n(데이터는 안전하게 보관되며 복구할 수 있습니다)',
        confirmText: '삭제',
        cancelText: '취소',
      })
      if (!confirmed) return
      await deletePeriod.mutateAsync(existingPeriod.id)
      setIsPeriodActive(false)
      setFlowIntensity(null)
      vibrate('medium')
    } else {
      await addPeriod.mutateAsync({
        start_date: dateStr,
        flow_intensity: flowIntensity,
      })
      setIsPeriodActive(true)
      vibrate('success')
    }
  }

  const handleEndPeriod = async () => {
    if (!existingPeriod) return
    await updatePeriod.mutateAsync({
      id: existingPeriod.id,
      end_date: dateStr,
    })
    setIsEndDateMode(false)
  }

  const handleClearEndDate = async () => {
    if (!existingPeriod) return
    await updatePeriod.mutateAsync({
      id: existingPeriod.id,
      end_date: null,
    })
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
      if (selectedSeveritySymptom === symptomType) setSelectedSeveritySymptom(null)
    } else {
      await addSymptom.mutateAsync({
        date: dateStr,
        symptom_type: symptomType,
        severity: 3,
      })
    }
    vibrate('light')
  }

  const handleSeverityChange = async (symptomType: SymptomType, severity: 1 | 2 | 3 | 4 | 5) => {
    const existing = symptoms.find((s) => s.symptom_type === symptomType)
    if (existing) {
      await updateSymptom.mutateAsync({ id: existing.id, severity })
    }
  }

  const handleSeverityToggle = useCallback((type: SymptomType) => {
    setSelectedSeveritySymptom((prev) => prev === type ? null : type)
  }, [])

  const activeSymptomTypes = new Set(symptoms.map((s) => s.symptom_type))

  const getSymptomSeverity = (type: SymptomType): number => {
    const s = symptoms.find((s) => s.symptom_type === type)
    return s?.severity ?? 3
  }

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
        <button className="date-nav-btn" onClick={() => goToDate(-1)} aria-label="이전 날짜">‹</button>
        <div className="date-display">
          <span className="date-text">{displayDate}</span>
          {isToday(selectedDate) ? (
            <span className="date-today-badge">오늘</span>
          ) : (
            <button
              className="date-today-btn"
              onClick={() => setSelectedDate(new Date())}
            >
              {(() => {
                const diff = differenceInDays(startOfDay(selectedDate), startOfDay(new Date()))
                if (diff < 0) return `${Math.abs(diff)}일 전`
                return `${diff}일 후`
              })()}
              {' '}→ 오늘
            </button>
          )}
        </div>
        <button className="date-nav-btn" onClick={() => goToDate(1)} aria-label="다음 날짜">›</button>
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

        {/* End Date */}
        {isPeriodActive && existingPeriod && (
          <div className="end-date-section">
            {existingPeriod.end_date ? (
              <div className="end-date-info">
                <span className="end-date-label">종료일: {existingPeriod.end_date}</span>
                <button className="end-date-clear-btn" onClick={handleClearEndDate}>
                  취소
                </button>
              </div>
            ) : isEndDateMode ? (
              <div className="end-date-confirm">
                <span className="end-date-label">오늘({dateStr})을 종료일로 설정?</span>
                <div className="end-date-actions">
                  <button className="end-date-yes-btn" onClick={handleEndPeriod}>
                    확인
                  </button>
                  <button className="end-date-no-btn" onClick={() => setIsEndDateMode(false)}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="end-date-btn"
                onClick={() => setIsEndDateMode(true)}
              >
                🏁 생리 종료 기록
              </button>
            )}
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
              <SymptomButton
                key={type}
                type={type}
                isActive={activeSymptomTypes.has(type)}
                severity={getSymptomSeverity(type)}
                onToggle={handleSymptomToggle}
                onSeverityToggle={handleSeverityToggle}
              />
            ))}
          </div>
        </div>

        <div className="symptom-category">
          <h4 className="symptom-category-title">기분</h4>
          <div className="symptom-grid">
            {ALL_SYMPTOMS.filter((s) => s.startsWith('mood_')).map((type) => (
              <SymptomButton
                key={type}
                type={type}
                isActive={activeSymptomTypes.has(type)}
                severity={getSymptomSeverity(type)}
                onToggle={handleSymptomToggle}
                onSeverityToggle={handleSeverityToggle}
              />
            ))}
          </div>
        </div>

        {/* Severity Slider */}
        {selectedSeveritySymptom && activeSymptomTypes.has(selectedSeveritySymptom) && (
          <div className="severity-panel">
            <div className="severity-header">
              <span>{SYMPTOM_ICONS[selectedSeveritySymptom]} {SYMPTOM_LABELS[selectedSeveritySymptom]}</span>
              <button className="severity-close" onClick={() => setSelectedSeveritySymptom(null)}>✕</button>
            </div>
            <div className="severity-slider-row">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  className={`severity-dot ${getSymptomSeverity(selectedSeveritySymptom) === level ? 'severity-dot--active' : ''}`}
                  onClick={() => handleSeverityChange(selectedSeveritySymptom, level)}
                >
                  <span className="severity-dot-num">{level}</span>
                  <span className="severity-dot-label">{SEVERITY_LABELS[level]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="record-section">
        <h3 className="section-title">
          💬 메모
          {isNoteSaving && <span className="note-status note-status--saving"> 저장 중...</span>}
          {notesSaved && <span className="note-status note-status--saved"> ✓ 저장됨</span>}
        </h3>
        <textarea
          className="notes-input"
          placeholder="오늘의 메모를 남겨보세요... (자동 저장)"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
