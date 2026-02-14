import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { format, isToday, differenceInDays, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/contexts/ToastContext'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useNotes } from '@/hooks/useNotes'
import { useMedications, useMedicationIntakes } from '@/hooks/useMedications'
import { useHaptic } from '@/hooks/useHaptic'
import { isDateInPeriod, getFlowForDate } from '@/lib/cycle'
import {
  SYMPTOM_LABELS,
  SYMPTOM_ICONS,
  FLOW_LABELS,
  MEDICATION_TYPE_ICONS,
  MEDICATION_TYPE_LABELS,
} from '@/types'
import type { SymptomType, FlowIntensity, MedicationType } from '@/types'
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

const MED_TYPES: MedicationType[] = ['otc', 'prescription', 'supplement']

export function RecordPage() {
  const { confirm, showToast } = useToast()
  const { vibrate } = useHaptic()
  const selectedDate = useAppStore((s) => s.selectedDate)
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })

  const { periods, addPeriod, updatePeriod, deletePeriod } = usePeriods()
  const { symptoms, addSymptom, deleteSymptom, updateSymptom } = useSymptoms(dateStr)
  const { note, saveNote, isSaving: isNoteSaving } = useNotes(dateStr)
  const { medications, addMedication, deleteMedication } = useMedications()
  const { intakes, addIntake, deleteIntake } = useMedicationIntakes(dateStr)

  const existingPeriod = isDateInPeriod(dateStr, periods)
  const [isPeriodActive, setIsPeriodActive] = useState(Boolean(existingPeriod))
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity | null>(
    getFlowForDate(existingPeriod, dateStr)
  )
  const [isEndDateMode, setIsEndDateMode] = useState(false)
  const [notes, setNotes] = useState(note ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [selectedSeveritySymptom, setSelectedSeveritySymptom] = useState<SymptomType | null>(null)
  const [medInputName, setMedInputName] = useState('')
  const [medInputDosage, setMedInputDosage] = useState('')
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Medication registration form state
  const [showMedForm, setShowMedForm] = useState(false)
  const [newMedName, setNewMedName] = useState('')
  const [newMedType, setNewMedType] = useState<MedicationType>('otc')
  const [newMedStrength, setNewMedStrength] = useState('')
  const [newMedHospital, setNewMedHospital] = useState('')
  const [newMedDoctor, setNewMedDoctor] = useState('')
  const [newMedNotes, setNewMedNotes] = useState('')

  /** Build taken_at using selected date + current time */
  const buildTakenAt = () => `${dateStr}T${format(new Date(), 'HH:mm:ss')}`

  // Reset state when date changes
  useEffect(() => {
    const period = isDateInPeriod(dateStr, periods)
    setIsPeriodActive(Boolean(period))
    setFlowIntensity(getFlowForDate(period, dateStr))
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
        flow_intensities: flowIntensity ? { [dateStr]: flowIntensity } : {},
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
      const updatedMap = {
        ...(existingPeriod.flow_intensities ?? {}),
        [dateStr]: flow,
      }
      await updatePeriod.mutateAsync({
        id: existingPeriod.id,
        flow_intensities: updatedMap,
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

  // ── Medication handlers ──

  const resetMedForm = () => {
    setNewMedName('')
    setNewMedType('otc')
    setNewMedStrength('')
    setNewMedHospital('')
    setNewMedDoctor('')
    setNewMedNotes('')
  }

  const handleRegisterMed = async () => {
    if (!newMedName.trim()) return
    try {
      await addMedication.mutateAsync({
        name: newMedName.trim(),
        type: newMedType,
        strength: newMedStrength.trim() || null,
        hospital: newMedType === 'prescription' ? (newMedHospital.trim() || null) : null,
        doctor: newMedType === 'prescription' ? (newMedDoctor.trim() || null) : null,
        prescription_notes: newMedType === 'prescription' ? (newMedNotes.trim() || null) : null,
      })
      resetMedForm()
      setShowMedForm(false)
      showToast('약이 등록되었습니다', 'success')
      vibrate('success')
    } catch {
      showToast('약 등록에 실패했습니다', 'error')
    }
  }

  const handleDeleteMed = async (medId: string, medName: string) => {
    const confirmed = await confirm({
      title: '약 삭제',
      message: `'${medName}'을(를) 등록 목록에서 삭제하시겠습니까?\n(기존 복용 기록은 유지됩니다)`,
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return
    try {
      await deleteMedication.mutateAsync(medId)
      showToast('삭제되었습니다', 'success')
      vibrate('medium')
    } catch {
      showToast('삭제에 실패했습니다', 'error')
    }
  }

  const handleQuickAdd = async (med: typeof medications[number]) => {
    try {
      await addIntake.mutateAsync({
        medication_id: med.id,
        medication_name: med.name,
        dosage: med.strength ?? null,
        taken_at: buildTakenAt(),
      })
      showToast(`${med.name} 복용 기록됨`, 'success')
      vibrate('light')
    } catch {
      showToast('복용 기록 추가에 실패했습니다', 'error')
    }
  }

  const handleManualIntake = async () => {
    if (!medInputName.trim()) return
    try {
      await addIntake.mutateAsync({
        medication_name: medInputName.trim(),
        dosage: medInputDosage.trim() || null,
        taken_at: buildTakenAt(),
      })
      setMedInputName('')
      setMedInputDosage('')
      showToast('복용 기록이 추가되었습니다', 'success')
      vibrate('light')
    } catch {
      showToast('복용 기록 추가에 실패했습니다', 'error')
    }
  }

  const handleDeleteIntake = async (intakeId: string) => {
    try {
      await deleteIntake.mutateAsync(intakeId)
      vibrate('light')
    } catch {
      showToast('삭제에 실패했습니다', 'error')
    }
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

      {/* Medications */}
      <div className="record-section">
        <h3 className="section-title">💊 복용 기록</h3>

        {/* ── Medication Registration Form ── */}
        {showMedForm ? (
          <div className="med-register-form">
            <div className="med-register-header">
              <span className="med-register-title">새 약 등록</span>
              <button className="severity-close" onClick={() => { setShowMedForm(false); resetMedForm() }}>✕</button>
            </div>

            <input
              className="med-manual-input"
              type="text"
              placeholder="약 이름 (필수)"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
            />

            <div className="med-type-selector">
              {MED_TYPES.map((t) => (
                <button
                  key={t}
                  className={`med-type-btn ${newMedType === t ? 'med-type-btn--active' : ''}`}
                  onClick={() => setNewMedType(t)}
                >
                  {MEDICATION_TYPE_ICONS[t]} {MEDICATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <input
              className="med-manual-input"
              type="text"
              placeholder="용량 (예: 200mg)"
              value={newMedStrength}
              onChange={(e) => setNewMedStrength(e.target.value)}
            />

            {newMedType === 'prescription' && (
              <div className="med-rx-fields">
                <input
                  className="med-manual-input"
                  type="text"
                  placeholder="병원명"
                  value={newMedHospital}
                  onChange={(e) => setNewMedHospital(e.target.value)}
                />
                <input
                  className="med-manual-input"
                  type="text"
                  placeholder="담당의"
                  value={newMedDoctor}
                  onChange={(e) => setNewMedDoctor(e.target.value)}
                />
                <input
                  className="med-manual-input"
                  type="text"
                  placeholder="처방 메모"
                  value={newMedNotes}
                  onChange={(e) => setNewMedNotes(e.target.value)}
                />
              </div>
            )}

            <button
              className="med-register-submit"
              disabled={!newMedName.trim() || addMedication.isPending}
              onClick={handleRegisterMed}
            >
              {addMedication.isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        ) : (
          <button
            className="med-register-toggle"
            onClick={() => setShowMedForm(true)}
          >
            + 새 약 등록
          </button>
        )}

        {/* ── Quick-add from registered medications ── */}
        {medications.length > 0 && (
          <div className="med-quick-list">
            {medications.map((med) => (
              <button
                key={med.id}
                className="med-quick-btn"
                disabled={addIntake.isPending}
                onClick={() => handleQuickAdd(med)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  handleDeleteMed(med.id, med.name)
                }}
                aria-label={`${med.name} 복용 기록 (길게 눌러 삭제)`}
              >
                {MEDICATION_TYPE_ICONS[med.type]} {med.name}
                {med.strength && <span className="med-quick-strength">{med.strength}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Manual entry with dosage ── */}
        <div className="med-manual-form">
          <input
            className="med-manual-input"
            type="text"
            placeholder="약 이름 입력..."
            value={medInputName}
            onChange={(e) => setMedInputName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && medInputName.trim()) {
                await handleManualIntake()
              }
            }}
          />
          <input
            className="med-manual-dosage"
            type="text"
            placeholder="용량"
            value={medInputDosage}
            onChange={(e) => setMedInputDosage(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && medInputName.trim()) {
                await handleManualIntake()
              }
            }}
          />
          <button
            className="med-manual-submit"
            disabled={!medInputName.trim() || addIntake.isPending}
            onClick={handleManualIntake}
          >
            {addIntake.isPending ? '...' : '복용'}
          </button>
        </div>

        {/* ── Intake list ── */}
        {intakes.length > 0 ? (
          <div className="med-intake-list">
            {intakes.map((intake) => (
              <div key={intake.id} className="med-intake-item">
                <span className="med-intake-name">{intake.medication_name}</span>
                <span className="med-intake-time">
                  {format(new Date(intake.taken_at), 'HH:mm')}
                </span>
                {intake.dosage && (
                  <span className="med-intake-dosage">{intake.dosage}</span>
                )}
                <button
                  className="med-intake-delete"
                  disabled={deleteIntake.isPending}
                  onClick={() => handleDeleteIntake(intake.id)}
                  aria-label="복용 기록 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="med-empty">아직 복용 기록이 없어요</p>
        )}
      </div>
    </div>
  )
}
