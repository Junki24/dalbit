import { useState, useMemo } from 'react'
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
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { useAppStore } from '@/lib/store'
import {
  isDateInPeriod,
  isDateInPredictedPeriod,
  isDateInFertileWindow,
  isOvulationDay,
} from '@/lib/cycle'
import type { CalendarDay } from '@/types'
import './CalendarPage.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const { prediction } = useCyclePrediction(periods)
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)

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
        flowIntensity: period?.flow_intensity ?? null,
      }
    })
  }, [currentMonth, periods, symptoms, prediction])

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date)
    navigate('/record')
  }

  return (
    <div className="calendar-page">
      {/* Month Navigation */}
      <div className="month-nav">
        <button
          className="month-nav-btn"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
        >
          ‹
        </button>
        <h2 className="month-title">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          className="month-nav-btn"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
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
      </div>

      {/* Weekday Headers */}
      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day) => {
          const classes = ['calendar-day']
          if (!day.isCurrentMonth) classes.push('calendar-day--outside')
          if (day.isToday) classes.push('calendar-day--today')
          if (day.isPeriod) classes.push('calendar-day--period')
          if (day.isPredictedPeriod) classes.push('calendar-day--predicted')
          if (day.isFertile && !day.isOvulation) classes.push('calendar-day--fertile')
          if (day.isOvulation) classes.push('calendar-day--ovulation')

          return (
            <button
              key={day.dateStr}
              className={classes.join(' ')}
              onClick={() => handleDayClick(day)}
            >
              <span className="calendar-day-number">
                {format(day.date, 'd')}
              </span>
              {day.symptoms.length > 0 && (
                <span className="calendar-day-dot" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date info could go here */}
    </div>
  )
}
