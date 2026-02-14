import { differenceInDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { usePeriods } from '@/hooks/usePeriods'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useAuth } from '@/contexts/AuthContext'
import { InstallBanner } from '@/components/InstallBanner'
import { HomePageSkeleton } from '@/components/Skeleton'
import { SYMPTOM_ICONS, SYMPTOM_LABELS } from '@/types'
import type { SymptomType } from '@/types'
import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()
  const { userSettings } = useAuth()
  const { periods, isLoading } = usePeriods()
  const { prediction, cycleDay, phaseInfo } = useCyclePrediction(periods)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { symptoms: todaySymptoms } = useSymptoms(todayStr)

  const daysUntilNextPeriod = prediction
    ? differenceInDays(prediction.nextPeriodDate, new Date())
    : null

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

      {/* Cycle Day Circle */}
      <div className="cycle-circle">
        <div
          className="cycle-circle-inner"
          style={{
            borderColor: phaseInfo?.color ?? 'var(--color-primary)',
          }}
        >
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

      {/* Phase Info */}
      {phaseInfo && (
        <div className="phase-card" style={{ borderLeftColor: phaseInfo.color }}>
          <div className="phase-card-header">
            <span className="phase-name">{phaseInfo.phaseKo}</span>
            <span className="phase-desc">{phaseInfo.description}</span>
          </div>
          <p className="partner-tip">💡 {phaseInfo.partnerTip}</p>
        </div>
      )}

      {/* Prediction Cards */}
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
                신뢰도: {prediction.confidence === 'high' ? '높음' : prediction.confidence === 'medium' ? '보통' : '낮음'}
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

      {/* Today's Symptoms */}
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

      {/* Quick Actions */}
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
