import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format, parseISO, startOfDay, isAfter } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useIntimacy } from '@/hooks/useIntimacy'
import { usePartnerData } from '@/hooks/usePartnerData'
import { useToast } from '@/contexts/ToastContext'
import { isDateInFertileWindow } from '@/lib/cycle'
import {
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ICONS,
  PROTECTION_METHOD_LABELS,
} from '@/types'
import type { TimeOfDay, ProtectionMethod } from '@/types'
import './PartnerRecordPage.css'

const ALL_TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']
const ALL_METHODS: ProtectionMethod[] = ['condom', 'pill', 'iud', 'other']

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function PartnerRecordPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast, confirm } = useToast()
  const { isLinked, isLoading: partnerLoading, partnerName, partnerData } = usePartnerData()

  // ── Date from URL ──
  const dateStr = useMemo(() => {
    const raw = searchParams.get('date')
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const parsed = parseISO(raw)
      if (isAfter(startOfDay(parsed), startOfDay(new Date()))) {
        return toDateStr(new Date())
      }
      return raw
    }
    return toDateStr(new Date())
  }, [searchParams])

  const selectedDate = useMemo(() => parseISO(dateStr), [dateStr])
  const isToday = toDateStr(new Date()) === dateStr
  const displayDate = format(selectedDate, 'M월 d일 (EEE)', { locale: ko })

  // ── Data hooks ──
  const { records, addRecord, deleteRecord } = useIntimacy(dateStr)
  const prediction = partnerData?.prediction ?? null
  const phaseInfo = partnerData?.phaseInfo ?? null

  const isFertile = useMemo(
    () => isDateInFertileWindow(selectedDate, prediction),
    [selectedDate, prediction],
  )

  // ── Form state ──
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null)
  const [protectionUsed, setProtectionUsed] = useState<boolean | null>(null)
  const [protectionMethod, setProtectionMethod] = useState<ProtectionMethod | null>(null)
  const [note, setNote] = useState('')

  // ── Date navigation ──
  const goToDate = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    if (isAfter(startOfDay(next), startOfDay(new Date()))) return
    setSearchParams({ date: toDateStr(next) })
  }

  const isTomorrow = useMemo(() => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    return isAfter(startOfDay(next), startOfDay(new Date()))
  }, [selectedDate])

  // ── Handlers ──
  const handleSave = async () => {
    try {
      await addRecord.mutateAsync({
        date: dateStr,
        time_of_day: timeOfDay,
        protection_used: protectionUsed,
        protection_method: protectionUsed ? protectionMethod : null,
        note: note.trim() || null,
      })
      setTimeOfDay(null)
      setProtectionUsed(null)
      setProtectionMethod(null)
      setNote('')
      showToast('기록이 저장되었습니다', 'success')
    } catch {
      showToast('저장에 실패했습니다', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '기록 삭제',
      message: '이 관계 기록을 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    })
    if (!confirmed) return
    try {
      await deleteRecord.mutateAsync(id)
      showToast('삭제되었습니다', 'success')
    } catch {
      showToast('삭제에 실패했습니다', 'error')
    }
  }

  if (partnerLoading) {
    return (
      <div className="pr-page" aria-busy="true" aria-label="기록 데이터 로딩 중">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton" style={{ height: '32px', width: '60px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '24px', width: '100px', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="skeleton" style={{ height: '44px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="pr-page">
      {/* ── Header with back button ── */}
      <div className="pr-header">
        <button className="pr-back-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">← 뒤로</button>
        <h2 className="pr-page-title">관계 기록</h2>
      </div>

      {/* ── Date Navigation ── */}
      <div className="pr-date-nav">
        <button
          className="pr-date-arrow"
          onClick={() => goToDate(-1)}
          aria-label="이전 날짜"
        >
          ‹
        </button>
        <div className="pr-date-center">
          <span className="pr-date-text">{displayDate}</span>
          {isToday && <span className="pr-today-badge">오늘</span>}
        </div>
        <button
          className="pr-date-arrow"
          onClick={() => goToDate(1)}
          disabled={isTomorrow}
          aria-label="다음 날짜"
        >
          ›
        </button>
      </div>

      {/* ── Partner Context Card ── */}
      {isLinked && phaseInfo && (
        <div className="pr-context-card">
          <div className="pr-context-header">
            <span
              className="pr-phase-badge"
              style={{ background: phaseInfo.color }}
            >
              {phaseInfo.phaseKo}
            </span>
            <span className="pr-partner-name">
              {partnerName ?? '파트너'}의 주기
            </span>
          </div>
          <p className="pr-context-tip">💡 {phaseInfo.partnerTip}</p>
        </div>
      )}

      {/* ── Fertile Warning Banner ── */}
      {isFertile && (
        <div className="pr-fertile-banner">
          <span className="pr-fertile-icon">⚠️</span>
          <span className="pr-fertile-text">
            현재 파트너의 가임기입니다. 피임에 주의해 주세요.
          </span>
        </div>
      )}

      {/* ── Existing Records ── */}
      {records.length > 0 && (
        <div className="pr-section">
          <h3 className="pr-section-title">
            📋 기록된 내역
            <span className="pr-count-badge">{records.length}</span>
          </h3>
          <div className="pr-records-list">
            {records.map((rec) => (
              <div key={rec.id} className="pr-record-item">
                <div className="pr-record-info">
                  {rec.time_of_day && (
                    <span className="pr-record-time">
                      {TIME_OF_DAY_ICONS[rec.time_of_day]}{' '}
                      {TIME_OF_DAY_LABELS[rec.time_of_day]}
                    </span>
                  )}
                  {rec.protection_used !== null && (
                    <span
                      className={`pr-record-protection ${
                        !rec.protection_used ? 'pr-record-protection--no' : ''
                      }`}
                    >
                      {rec.protection_used
                        ? `🛡️ ${
                            rec.protection_method
                              ? PROTECTION_METHOD_LABELS[rec.protection_method]
                              : '피임'
                          }`
                        : '피임 안 함'}
                    </span>
                  )}
                  {rec.note && (
                    <span className="pr-record-note">{rec.note}</span>
                  )}
                </div>
                <button
                  className="pr-record-delete"
                  onClick={() => handleDelete(rec.id)}
                  aria-label="기록 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Record Form ── */}
      <div className="pr-section">
        <h3 className="pr-section-title">💜 관계 기록</h3>

        {/* Time of Day */}
        <div className="pr-field">
          <span className="pr-field-label">시간대</span>
          <div className="pr-time-grid">
            {ALL_TIMES.map((t) => (
              <button
                key={t}
                className={`pr-time-btn ${timeOfDay === t ? 'pr-time-btn--active' : ''}`}
                onClick={() => setTimeOfDay(timeOfDay === t ? null : t)}
              >
                <span className="pr-time-icon">{TIME_OF_DAY_ICONS[t]}</span>
                <span className="pr-time-label">{TIME_OF_DAY_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Protection Toggle */}
        <div className="pr-field">
          <span className="pr-field-label">피임 여부</span>
          <div className="pr-protection-row">
            <button
              className={`pr-protection-btn ${protectionUsed === true ? 'pr-protection-btn--yes' : ''}`}
              onClick={() => setProtectionUsed(protectionUsed === true ? null : true)}
            >
              🛡️ 사용함
            </button>
            <button
              className={`pr-protection-btn ${protectionUsed === false ? 'pr-protection-btn--no' : ''}`}
              onClick={() => setProtectionUsed(protectionUsed === false ? null : false)}
            >
              안 함
            </button>
          </div>
        </div>

        {/* Protection Method (conditional) */}
        {protectionUsed === true && (
          <div className="pr-field pr-field--methods">
            <span className="pr-field-label">피임 방법</span>
            <div className="pr-method-chips">
              {ALL_METHODS.map((m) => (
                <button
                  key={m}
                  className={`pr-method-chip ${protectionMethod === m ? 'pr-method-chip--active' : ''}`}
                  onClick={() =>
                    setProtectionMethod(protectionMethod === m ? null : m)
                  }
                >
                  {PROTECTION_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note Input */}
        <div className="pr-field">
          <span className="pr-field-label">메모</span>
          <input
            className="pr-note-input"
            type="text"
            placeholder="메모를 남겨보세요 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Save Button */}
        <button
          className="pr-save-btn"
          disabled={addRecord.isPending}
          onClick={handleSave}
        >
          {addRecord.isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
