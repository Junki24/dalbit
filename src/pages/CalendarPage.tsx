import { useState, useMemo, useCallback, memo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useIntimacy } from '@/hooks/useIntimacy'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { useAppStore } from '@/lib/store'
import { CalendarPageSkeleton } from '@/components/Skeleton'
import { useSwipe } from '@/hooks/useSwipe'
import {
  isDateInPeriod,
  isDateInPredictedPeriod,
  isDateInFertileWindow,
  isOvulationDay,
  getFlowForDate,
} from '@/lib/cycle'
import { SYMPTOM_ICONS, SYMPTOM_LABELS, FLOW_LABELS } from '@/types'
import type { CalendarDay, SymptomType } from '@/types'
import './CalendarPage.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** Memo'd calendar day cell — only re-renders when its own day data or selection changes */
const CalendarDayCell = memo(function CalendarDayCell({
  day,
  isSelected,
  onClick,
}: {
  day: CalendarDay
  isSelected: boolean
  onClick: (day: CalendarDay) => void
}) {
  const classes = ['calendar-day']
  if (!day.isCurrentMonth) classes.push('calendar-day--outside')
  if (day.isToday) classes.push('calendar-day--today')
  if (day.isPeriod) classes.push('calendar-day--period')
  if (day.isPredictedPeriod) classes.push('calendar-day--predicted')
  if (day.isFertile && !day.isOvulation) classes.push('calendar-day--fertile')
  if (day.isOvulation) classes.push('calendar-day--ovulation')
  if (isSelected) classes.push('calendar-day--selected')

  const dayLabel = format(day.date, 'M월 d일 EEEE', { locale: ko })
  const statusParts: string[] = []
  if (day.isPeriod) statusParts.push('생리')
  if (day.isPredictedPeriod) statusParts.push('예상 생리')
  if (day.isFertile) statusParts.push('가임기')
  if (day.isOvulation) statusParts.push('배란일')
  if (day.symptoms.length > 0) statusParts.push(`증상 ${day.symptoms.length}개`)
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
      <span className="calendar-day-number">
        {format(day.date, 'd')}
      </span>
      {day.symptoms.length > 0 && (
        <span className="calendar-day-dot" aria-hidden="true" />
      )}
      {day.hasIntimacy && (
        <span className="calendar-day-dot calendar-day-dot--intimacy" aria-hidden="true" />
      )}
    </button>
  )
})

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const { periods, isLoading } = usePeriods()
  const { symptoms } = useSymptoms()
  const { records: intimacyRecords } = useIntimacy()
  const { prediction } = useCyclePrediction(periods)
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)

  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), [])
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), [])
  const swipeHandlers = useSwipe({ onSwipeLeft: goToNextMonth, onSwipeRight: goToPrevMonth })

  const calendarDays = useMemo((): CalendarDay[] => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: calStart, end: calEnd })
    const today = new Date()

    return days.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const period = isDateInPeriod(dateStr, periods)
      const daySymptoms = symptoms.filter((s: { date: string }) => s.date === dateStr)

      return {
        date,
        dateStr,
        isPeriod: Boolean(period),
        isPredictedPeriod: !period && isDateInPredictedPeriod(date, prediction),
        isFertile: isDateInFertileWindow(date, prediction),
        isOvulation: isOvulationDay(date, prediction),
        isToday: isSameDay(date, today),
        isCurrentMonth: isSameMonth(date, currentMonth),
        symptoms: daySymptoms,
        flowIntensity: getFlowForDate(period, dateStr),
        hasIntimacy: intimacyRecords.some((r) => r.date === dateStr),
      }
    })
  }, [currentMonth, periods, symptoms, prediction, intimacyRecords])

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(selectedDay?.dateStr === day.dateStr ? null : day)
  }

  const handleGoToRecord = () => {
    if (selectedDay) {
      setSelectedDate(selectedDay.date)
      navigate('/record')
    }
  }

  if (isLoading) {
    return <div className="calendar-page"><CalendarPageSkeleton /></div>
  }

  return (
    <div className="calendar-page">
      {/* Month Navigation */}
      <div className="month-nav">
        <button
          className="month-nav-btn"
          onClick={goToPrevMonth}
          aria-label="이전 월"
        >
          ‹
        </button>
        <h2 className="month-title">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          className="month-nav-btn"
          onClick={goToNextMonth}
          aria-label="다음 월"
        >
          ›
        </button>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <span className="legend-item">
          <span className="legend-dot legend-dot--period" />
          생리
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot--predicted" />
          예상 생리
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot--fertile" />
          가임기
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot--ovulation" />
          배란일
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot--intimacy" />
          관계
        </span>
      </div>

      {/* Weekday Headers + Calendar Grid */}
      <div className="calendar-grid" {...swipeHandlers}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day) => (
          <CalendarDayCell
            key={day.dateStr}
            day={day}
            isSelected={selectedDay?.dateStr === day.dateStr}
            onClick={handleDayClick}
          />
        ))}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <div className="day-detail-panel">
          <div className="day-detail-header">
            <h3 className="day-detail-date">
              {format(selectedDay.date, 'M월 d일 (EEEE)', { locale: ko })}
            </h3>
            <button className="day-detail-close" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          <div className="day-detail-tags">
            {selectedDay.isPeriod && (
              <span className="day-tag day-tag--period">
                🩸 생리{selectedDay.flowIntensity ? ` (${FLOW_LABELS[selectedDay.flowIntensity]})` : ''}
              </span>
            )}
            {selectedDay.isPredictedPeriod && (
              <span className="day-tag day-tag--predicted">🩸 예상 생리</span>
            )}
            {selectedDay.isOvulation && (
              <span className="day-tag day-tag--ovulation">🥚 배란일</span>
            )}
            {selectedDay.isFertile && !selectedDay.isOvulation && (
              <span className="day-tag day-tag--fertile">💫 가임기</span>
            )}
            {selectedDay.hasIntimacy && (
              <span className="day-tag day-tag--intimacy">💜 관계</span>
            )}
          </div>

          {selectedDay.symptoms.length > 0 ? (
            <div className="day-detail-symptoms">
              {selectedDay.symptoms.map((s) => (
                <span key={s.id} className="day-symptom-chip">
                  {SYMPTOM_ICONS[s.symptom_type as SymptomType]}{' '}
                  {SYMPTOM_LABELS[s.symptom_type as SymptomType]}
                </span>
              ))}
            </div>
          ) : (
            <p className="day-detail-empty">기록된 증상이 없어요</p>
          )}

          <button className="day-detail-edit-btn" onClick={handleGoToRecord}>
            ✏️ 이 날짜 기록하기
          </button>
        </div>
      )}
    </div>
  )
}
