import { useMemo } from 'react'
import { differenceInDays, format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { usePeriods } from '@/hooks/usePeriods'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useInsights } from '@/hooks/useInsights'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/lib/store'
import { InstallBanner } from '@/components/InstallBanner'
import { HomePageSkeleton } from '@/components/Skeleton'
import {
  isDateInPeriod,
  isDateInPredictedPeriod,
  isDateInFertileWindow,
  isOvulationDay,
} from '@/lib/cycle'
import { SYMPTOM_ICONS, SYMPTOM_LABELS } from '@/types'
import type { SymptomType, Period, Symptom, CyclePrediction } from '@/types'
import './HomePage.css'

// ── SVG Cycle Progress Ring ──
function CycleRing({
  cycleDay,
  totalDays,
  phaseColor,
}: {
  cycleDay: number | null
  totalDays: number
  phaseColor: string
}) {
  const radius = 62
  const strokeWidth = 7
  const circumference = 2 * Math.PI * radius
  const progress = cycleDay ? Math.min(cycleDay / totalDays, 1) : 0
  const offset = circumference * (1 - progress)

  return (
    <div className="cycle-ring-container">
      <svg className="cycle-ring-svg" viewBox="0 0 150 150">
        {/* Track */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress arc */}
        <circle
          className="cycle-ring-progress"
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={phaseColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 75 75)"
        />
        {/* Glow layer */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={phaseColor}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 75 75)"
          opacity={0.15}
        />
      </svg>
      <div className="cycle-ring-center">
        {cycleDay ? (
          <>
            <span className="cycle-day-number">{cycleDay}</span>
            <span className="cycle-day-label">일째</span>
          </>
        ) : (
          <>
            <span className="cycle-day-number">?</span>
            <span className="cycle-day-label">기록 필요</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Weekly Mini Calendar Strip ──
function WeeklyStrip({
  periods,
  symptoms,
  prediction,
  onDayClick,
}: {
  periods: Period[]
  symptoms: Symptom[]
  prediction: CyclePrediction | null
  onDayClick: (date: Date) => void
}) {
  const today = useMemo(() => new Date(), [])
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const isPeriod = Boolean(isDateInPeriod(dateStr, periods))
      const isPredicted = !isPeriod && isDateInPredictedPeriod(date, prediction)
      const isFertile = isDateInFertileWindow(date, prediction)
      const isOvulation = isOvulationDay(date, prediction)
      const hasSymptom = symptoms.some((s) => s.date === dateStr)
      const isToday = isSameDay(date, today)

      return { date, dateStr, isPeriod, isPredicted, isFertile, isOvulation, hasSymptom, isToday }
    })
  }, [weekStart, periods, symptoms, prediction, today])

  return (
    <div className="weekly-strip">
      {days.map((day) => {
        const classes = ['weekly-day']
        if (day.isToday) classes.push('weekly-day--today')
        if (day.isPeriod) classes.push('weekly-day--period')
        else if (day.isPredicted) classes.push('weekly-day--predicted')
        else if (day.isOvulation) classes.push('weekly-day--ovulation')
        else if (day.isFertile) classes.push('weekly-day--fertile')

        return (
          <button
            key={day.dateStr}
            className={classes.join(' ')}
            onClick={() => onDayClick(day.date)}
            aria-label={format(day.date, 'M월 d일 EEEE', { locale: ko })}
          >
            <span className="weekly-day-name">
              {format(day.date, 'E', { locale: ko })}
            </span>
            <span className="weekly-day-num">{format(day.date, 'd')}</span>
            {day.hasSymptom && <span className="weekly-day-dot" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Insight Card ──
function InsightCard({
  insight,
}: {
  insight: { id: string; icon: string; title: string; description: string; type: string }
}) {
  return (
    <div className={`insight-card insight-card--${insight.type}`}>
      <span className="insight-icon">{insight.icon}</span>
      <div className="insight-content">
        <span className="insight-title">{insight.title}</span>
        <span className="insight-desc">{insight.description}</span>
      </div>
    </div>
  )
}

// ── Main HomePage ──
export function HomePage() {
  const navigate = useNavigate()
  const { userSettings } = useAuth()
  const { periods, isLoading } = usePeriods()
  const { prediction, cycleDay, phaseInfo } = useCyclePrediction(periods)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { symptoms: todaySymptoms } = useSymptoms(todayStr)
  const { symptoms: allSymptoms } = useSymptoms()
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)
  const insights = useInsights(periods, allSymptoms, prediction, cycleDay)

  const totalDays = prediction?.averageCycleLength ?? userSettings?.average_cycle_length ?? 28
  const phaseColor = phaseInfo?.color ?? 'var(--color-primary)'

  const daysUntilNextPeriod = prediction
    ? differenceInDays(prediction.nextPeriodDate, new Date())
    : null

  const handleWeekDayClick = (date: Date) => {
    setSelectedDate(date)
    navigate('/record')
  }

  if (isLoading) {
    return (
      <div className="home-page">
        <InstallBanner />
        <HomePageSkeleton />
      </div>
    )
  }

  return (
    <div className="home-page">
      <InstallBanner />

      {/* ── Cycle Progress Ring ── */}
      <CycleRing cycleDay={cycleDay} totalDays={totalDays} phaseColor={phaseColor} />

      {/* ── Phase Info ── */}
      {phaseInfo && (
        <div className="phase-card" style={{ borderLeftColor: phaseInfo.color }}>
          <div className="phase-card-header">
            <span className="phase-badge" style={{ background: phaseInfo.color }}>
              {phaseInfo.phaseKo}
            </span>
            <span className="phase-desc">{phaseInfo.description}</span>
          </div>
          <p className="partner-tip">💡 {phaseInfo.partnerTip}</p>
        </div>
      )}

      {/* ── Weekly Strip ── */}
      <div className="section-header">
        <h3>이번 주</h3>
      </div>
      <WeeklyStrip
        periods={periods}
        symptoms={allSymptoms}
        prediction={prediction}
        onDayClick={handleWeekDayClick}
      />

      {/* ── Prediction Cards ── */}
      <div className="prediction-grid">
        <div className="prediction-card">
          <span className="prediction-icon">🩸</span>
          <span className="prediction-label">다음 생리</span>
          {prediction ? (
            <>
              <span className="prediction-value">
                {daysUntilNextPeriod !== null && daysUntilNextPeriod >= 0
                  ? `${daysUntilNextPeriod}일 후`
                  : '예측 기간 지남'}
              </span>
              <span className="prediction-date">
                {format(prediction.nextPeriodDate, 'M월 d일 (E)', { locale: ko })}
              </span>
            </>
          ) : (
            <span className="prediction-value prediction-empty">데이터 필요</span>
          )}
        </div>

        <div className="prediction-card">
          <span className="prediction-icon">🥚</span>
          <span className="prediction-label">배란 예정일</span>
          {prediction ? (
            <>
              <span className="prediction-value">
                {format(prediction.ovulationDate, 'M월 d일', { locale: ko })}
              </span>
              <span className="prediction-date prediction-confidence">
                신뢰도:{' '}
                {prediction.confidence === 'high'
                  ? '높음'
                  : prediction.confidence === 'medium'
                    ? '보통'
                    : '낮음'}
              </span>
            </>
          ) : (
            <span className="prediction-value prediction-empty">데이터 필요</span>
          )}
        </div>

        <div className="prediction-card">
          <span className="prediction-icon">💫</span>
          <span className="prediction-label">가임기</span>
          {prediction ? (
            <span className="prediction-value">
              {format(prediction.fertileWindowStart, 'M/d')} ~{' '}
              {format(prediction.fertileWindowEnd, 'M/d')}
            </span>
          ) : (
            <span className="prediction-value prediction-empty">데이터 필요</span>
          )}
        </div>

        <div className="prediction-card">
          <span className="prediction-icon">📏</span>
          <span className="prediction-label">평균 주기</span>
          <span className="prediction-value">
            {prediction
              ? `${prediction.averageCycleLength}일`
              : `${userSettings?.average_cycle_length ?? 28}일`}
          </span>
        </div>
      </div>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <>
          <div className="section-header">
            <h3>맞춤 인사이트</h3>
          </div>
          <div className="insights-list">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </>
      )}

      {/* ── Today's Symptoms ── */}
      {todaySymptoms.length > 0 && (
        <div className="today-symptoms">
          <h3>오늘의 기록</h3>
          <div className="symptom-tags">
            {todaySymptoms.map((s) => (
              <span key={s.id} className="symptom-tag">
                {SYMPTOM_ICONS[s.symptom_type as SymptomType]}{' '}
                {SYMPTOM_LABELS[s.symptom_type as SymptomType]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="quick-actions">
        <button
          className="quick-action-btn quick-action-period"
          onClick={() => navigate('/record')}
        >
          🩸 생리 기록하기
        </button>
        <button
          className="quick-action-btn quick-action-symptom"
          onClick={() => navigate('/record')}
        >
          📝 증상 기록하기
        </button>
      </div>
    </div>
  )
}
