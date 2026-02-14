import { differenceInDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { usePartnerData } from '@/hooks/usePartnerData'
import './PartnerPage.css'

export function PartnerPage() {
  const { isLinked, isLoading, partnerName, partnerData } = usePartnerData()

  if (isLoading) {
    return (
      <div className="partner-page">
        <div className="partner-loading">로딩 중...</div>
      </div>
    )
  }

  if (!isLinked || !partnerData) {
    return (
      <div className="partner-page">
        <div className="partner-empty">
          <span className="partner-empty-icon">💑</span>
          <h2>파트너 연결 없음</h2>
          <p>파트너에게 초대 링크를 받아 수락하면<br />여기서 주기 정보를 확인할 수 있어요.</p>
        </div>
      </div>
    )
  }

  const { prediction, cycleDay, phaseInfo } = partnerData
  const daysUntilNextPeriod = prediction
    ? differenceInDays(prediction.nextPeriodDate, new Date())
    : null

  return (
    <div className="partner-page">
      {/* Header */}
      <div className="partner-header">
        <span className="partner-avatar">💑</span>
        <h2>{partnerName ?? '파트너'}의 주기</h2>
      </div>

      {/* Cycle Day Circle */}
      <div className="partner-cycle-circle">
        <div
          className="partner-circle-inner"
          style={{ borderColor: phaseInfo?.color ?? 'var(--color-primary)' }}
        >
          {cycleDay ? (
            <>
              <span className="partner-day-number">{cycleDay}</span>
              <span className="partner-day-label">일째</span>
            </>
          ) : (
            <>
              <span className="partner-day-number">?</span>
              <span className="partner-day-label">데이터 없음</span>
            </>
          )}
        </div>
      </div>

      {/* Phase Info */}
      {phaseInfo && (
        <div className="partner-phase" style={{ borderLeftColor: phaseInfo.color }}>
          <div className="partner-phase-header">
            <span className="partner-phase-name">{phaseInfo.phaseKo}</span>
            <span className="partner-phase-desc">{phaseInfo.description}</span>
          </div>
          <p className="partner-tip">💡 {phaseInfo.partnerTip}</p>
        </div>
      )}

      {/* Prediction Cards */}
      <div className="partner-predictions">
        <div className="partner-pred-card">
          <span className="partner-pred-icon">🩸</span>
          <span className="partner-pred-label">다음 생리</span>
          {prediction && daysUntilNextPeriod !== null ? (
            <>
              <span className="partner-pred-value">
                {daysUntilNextPeriod >= 0
                  ? `${daysUntilNextPeriod}일 후`
                  : '예측 기간 지남'}
              </span>
              <span className="partner-pred-date">
                {format(prediction.nextPeriodDate, 'M월 d일 (E)', { locale: ko })}
              </span>
            </>
          ) : (
            <span className="partner-pred-value partner-pred-empty">데이터 필요</span>
          )}
        </div>

        <div className="partner-pred-card">
          <span className="partner-pred-icon">🥚</span>
          <span className="partner-pred-label">배란 예정일</span>
          {prediction ? (
            <span className="partner-pred-value">
              {format(prediction.ovulationDate, 'M월 d일', { locale: ko })}
            </span>
          ) : (
            <span className="partner-pred-value partner-pred-empty">데이터 필요</span>
          )}
        </div>

        <div className="partner-pred-card">
          <span className="partner-pred-icon">💫</span>
          <span className="partner-pred-label">가임기</span>
          {prediction ? (
            <span className="partner-pred-value">
              {format(prediction.fertileWindowStart, 'M/d')} ~{' '}
              {format(prediction.fertileWindowEnd, 'M/d')}
            </span>
          ) : (
            <span className="partner-pred-value partner-pred-empty">데이터 필요</span>
          )}
        </div>

        <div className="partner-pred-card">
          <span className="partner-pred-icon">📏</span>
          <span className="partner-pred-label">평균 주기</span>
          <span className="partner-pred-value">
            {prediction ? `${prediction.averageCycleLength}일` : '—'}
          </span>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="partner-privacy">
        <p>🔒 상세 증상 기록이나 메모는 공유되지 않습니다.</p>
      </div>
    </div>
  )
}
