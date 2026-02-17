import { useState, useMemo, useCallback, memo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { usePartnerData } from '@/hooks/usePartnerData'
import { useIntimacy } from '@/hooks/useIntimacy'
import { useSwipe } from '@/hooks/useSwipe'
import {
  isDateInPeriod,
  isDateInPredictedPeriod,
  isDateInFertileWindow,
  isOvulationDay,
  getCycleDay,
  getCyclePhaseInfo,
} from '@/lib/cycle'
import type { IntimacyRecord, CyclePhaseInfo } from '@/types'
import { TIME_OF_DAY_LABELS, TIME_OF_DAY_ICONS } from '@/types'
import './PartnerCalendarPage.css'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

interface PartnerCalendarDay {
  date: Date
  dateStr: string
  isPeriod: boolean
  isPredictedPeriod: boolean
  isFertile: boolean
  isOvulation: boolean
  isToday: boolean
  isCurrentMonth: boolean
  hasIntimacy: boolean
}

/* ── Memo'd day cell ── */
const PartnerDayCell = memo(function PartnerDayCell({
  day,
  isSelected,
  onClick,
}: {
  day: PartnerCalendarDay
  isSelected: boolean
  onClick: (day: PartnerCalendarDay) => void
}) {
  const classes = ['pc-day']
  if (!day.isCurrentMonth) classes.push('pc-day--outside')
  if (day.isToday) classes.push('pc-day--today')
  if (day.isPeriod) classes.push('pc-day--period')
  if (day.isPredictedPeriod) classes.push('pc-day--predicted')
  if (day.isFertile && !day.isOvulation) classes.push('pc-day--fertile')
  if (day.isOvulation) classes.push('pc-day--ovulation')
  if (isSelected) classes.push('pc-day--selected')

  const dayLabel = format(day.date, 'M월 d일 EEEE', { locale: ko })
  const statusParts: string[] = []
  if (day.isPeriod) statusParts.push('생리')
  if (day.isPredictedPeriod) statusParts.push('예상 생리')
  if (day.isFertile) statusParts.push('가임기')
  if (day.isOvulation) statusParts.push('배란일')
  if (day.hasIntimacy) statusParts.push('관계')
  const ariaLabel = statusParts.length > 0
    ? `${dayLabel}, ${statusParts.join(', ')}`
    : dayLabel

  return (
    <button
      className={classes.join(' ')}
      onClick={() => onClick(day)}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-current={day.isToday ? 'date' : undefined}
    >
      <span className="pc-day-number">{format(day.date, 'd')}</span>
      <div className="pc-day-indicators">
        {day.isOvulation && <span className="pc-indicator pc-indicator--ovulation" aria-hidden="true" />}
        {day.hasIntimacy && <span className="pc-indicator pc-indicator--intimacy" aria-hidden="true">💚</span>}
      </div>
    </button>
  )
})

/* ── Page ── */
export function PartnerCalendarPage() {
  const navigate = useNavigate()
  const { isLinked, isLoading, partnerName, partnerData } = usePartnerData()
  const partnerOwnerId = partnerData?.ownerSettings?.user_id
  const { records: intimacyRecords } = useIntimacy(undefined, partnerOwnerId ?? undefined)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<PartnerCalendarDay | null>(null)

  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), [])
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), [])
  const swipeHandlers = useSwipe({ onSwipeLeft: goToNextMonth, onSwipeRight: goToPrevMonth })

  const periods = partnerData?.periods ?? []
  const prediction = partnerData?.prediction ?? null

  /* Build calendar grid */
  const calendarDays = useMemo((): PartnerCalendarDay[] => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: PartnerCalendarDay[] = []
    const today = new Date()
    let cursor = calStart

    while (cursor <= calEnd) {
      const dateStr = format(cursor, 'yyyy-MM-dd')
      const period = isDateInPeriod(dateStr, periods)

      days.push({
        date: new Date(cursor),
        dateStr,
        isPeriod: Boolean(period),
        isPredictedPeriod: !period && isDateInPredictedPeriod(cursor, prediction),
        isFertile: isDateInFertileWindow(cursor, prediction),
        isOvulation: isOvulationDay(cursor, prediction),
        isToday: isSameDay(cursor, today),
        isCurrentMonth: isSameMonth(cursor, currentMonth),
        hasIntimacy: intimacyRecords.some((r) => r.date === dateStr),
      })
      cursor = addDays(cursor, 1)
    }

    return days
  }, [currentMonth, periods, prediction, intimacyRecords])

  /* Selected-day phase info */
  const selectedDayPhase = useMemo((): CyclePhaseInfo | null => {
    if (!selectedDay || periods.length === 0) return null
    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )
    const lastPeriodDate = parseISO(sorted[0].start_date)
    const cycleDay = getCycleDay(lastPeriodDate, selectedDay.date)
    const avgCycleLength = prediction?.averageCycleLength ?? 28
    return getCyclePhaseInfo(cycleDay, avgCycleLength)
  }, [selectedDay, periods, prediction])

  /* Selected-day intimacy records */
  const selectedDayRecords = useMemo((): IntimacyRecord[] => {
    if (!selectedDay) return []
    return intimacyRecords.filter((r) => r.date === selectedDay.dateStr)
  }, [selectedDay, intimacyRecords])

  const handleDayClick = (day: PartnerCalendarDay) => {
    setSelectedDay(selectedDay?.dateStr === day.dateStr ? null : day)
  }

  const handleGoToRecord = () => {
    if (selectedDay) {
      navigate(`/partner-record?date=${selectedDay.dateStr}`)
    }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="pc-page" aria-busy="true" aria-label="캘린더 데이터 로딩 중">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton" style={{ height: '32px', width: '60px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '24px', width: '120px', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ height: '36px', width: '36px', borderRadius: '50%' }} />
            <div className="skeleton" style={{ height: '24px', width: '140px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '36px', width: '36px', borderRadius: '50%' }} />
          </div>
          <div className="skeleton" style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '32px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    )
  }

  /* ── Empty state ── */
  if (!isLinked || !partnerData) {
    return (
      <div className="pc-page">
        <div className="pc-empty">
          <span className="pc-empty-icon">💑</span>
          <h2>파트너와 연결해보세요</h2>
          <p>
            설정에서 초대 링크를 생성하거나
            <br />
            파트너의 링크를 입력해주세요.
          </p>
          <button
            className="pc-empty-btn"
            onClick={() => navigate('/settings')}
          >
            설정에서 연결하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pc-page">
      {/* Header with back button */}
      <div className="pc-header">
        <button className="pc-back-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">← 뒤로</button>
        <h2 className="pc-page-title">파트너 캘린더</h2>
      </div>

      {/* Month Navigation */}
      <div className="pc-month-nav">
        <button className="pc-month-btn" onClick={goToPrevMonth} aria-label="이전 월">
          ‹
        </button>
        <h2 className="pc-month-title">
          {partnerName ? `${partnerName}의 ` : ''}
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button className="pc-month-btn" onClick={goToNextMonth} aria-label="다음 월">
          ›
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="pc-grid" {...swipeHandlers}>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={`pc-weekday${day === '토' ? ' pc-weekday--sat' : ''}${day === '일' ? ' pc-weekday--sun' : ''}`}
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day) => (
          <PartnerDayCell
            key={day.dateStr}
            day={day}
            isSelected={selectedDay?.dateStr === day.dateStr}
            onClick={handleDayClick}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="pc-legend">
        <span className="pc-legend-item">
          <span className="pc-legend-dot pc-legend-dot--period" />
          생리
        </span>
        <span className="pc-legend-item">
          <span className="pc-legend-dot pc-legend-dot--predicted" />
          예상 생리
        </span>
        <span className="pc-legend-item">
          <span className="pc-legend-dot pc-legend-dot--fertile" />
          가임기
        </span>
        <span className="pc-legend-item">
          <span className="pc-legend-dot pc-legend-dot--ovulation" />
          배란일
        </span>
        <span className="pc-legend-item">
          <span className="pc-legend-emoji">💚</span>
          관계
        </span>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="pc-detail">
          <div className="pc-detail-header">
            <h3 className="pc-detail-date">
              {format(selectedDay.date, 'M월 d일 (EEEE)', { locale: ko })}
            </h3>
            <button className="pc-detail-close" onClick={() => setSelectedDay(null)}>
              ✕
            </button>
          </div>

          {/* Phase Tags */}
          <div className="pc-detail-tags">
            {selectedDay.isPeriod && <span className="pc-tag pc-tag--period">🩸 생리</span>}
            {selectedDay.isPredictedPeriod && (
              <span className="pc-tag pc-tag--predicted">🩸 예상 생리</span>
            )}
            {selectedDay.isOvulation && <span className="pc-tag pc-tag--ovulation">🥚 배란일</span>}
            {selectedDay.isFertile && !selectedDay.isOvulation && (
              <span className="pc-tag pc-tag--fertile">💫 가임기</span>
            )}
          </div>

          {/* Phase Info + Partner Tip */}
          {selectedDayPhase && (
            <div className="pc-detail-phase" style={{ borderLeftColor: selectedDayPhase.color }}>
              <span className="pc-detail-phase-name">{selectedDayPhase.phaseKo}</span>
              <span className="pc-detail-phase-desc">{selectedDayPhase.description}</span>
              <p className="pc-detail-tip">💡 {selectedDayPhase.partnerTip}</p>
            </div>
          )}

          {/* Intimacy Records */}
          {selectedDayRecords.length > 0 ? (
            <div className="pc-detail-records">
              <span className="pc-detail-records-title">💚 관계 기록</span>
              {selectedDayRecords.map((record) => (
                <div key={record.id} className="pc-record-item">
                  {record.time_of_day && (
                    <span className="pc-record-chip">
                      {TIME_OF_DAY_ICONS[record.time_of_day]} {TIME_OF_DAY_LABELS[record.time_of_day]}
                    </span>
                  )}
                  {record.protection_used !== null && (
                    <span className="pc-record-chip">
                      {record.protection_used ? '🛡️ 피임함' : '⚠️ 피임 안 함'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="pc-detail-empty">이 날 관계 기록이 없어요</p>
          )}

          {/* Navigate to record page */}
          <button className="pc-record-btn" onClick={handleGoToRecord}>
            💚 관계 기록
          </button>
        </div>
      )}
    </div>
  )
}
