import { differenceInDays, format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { usePartnerData } from '@/hooks/usePartnerData'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import './PartnerPage.css'

export function PartnerPage() {
  const { user } = useAuth()
  const { isLinked, isLoading, partnerName, partnerData } = usePartnerData()

  // Derive values needed by the useQuery hook BEFORE any early returns
  // to satisfy React Rules of Hooks (hooks must be called in the same order every render)
  const partnerPeriods = partnerData?.periods ?? []
  const lastPeriodStart = partnerPeriods.length > 0
    ? [...partnerPeriods].sort((a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime())[0].start_date
    : null

  const { data: partnerIntimacyCount = 0 } = useQuery({
    queryKey: ['partner-intimacy', user?.id, lastPeriodStart],
    queryFn: async (): Promise<number> => {
      if (!user || !isSupabaseConfigured || !lastPeriodStart) return 0
      const ownerId = partnerPeriods[0]?.user_id
      if (!ownerId) return 0
      const { count, error } = await supabase
        .from('intimacy_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .gte('date', lastPeriodStart)
      if (error) return 0
      return count ?? 0
    },
    enabled: Boolean(user) && isSupabaseConfigured && Boolean(lastPeriodStart) && isLinked,
    staleTime: 5 * 60 * 1000,
  })

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

      {/* Intimacy in current cycle */}
      {lastPeriodStart && (
        <div className="partner-pred-card" style={{ marginTop: 8 }}>
          <span className="partner-pred-icon">💜</span>
          <span className="partner-pred-label">이번 주기 관계</span>
          <span className="partner-pred-value">
            {partnerIntimacyCount > 0 ? `${partnerIntimacyCount}회 기록됨` : '기록 없음'}
          </span>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="partner-privacy">
        <p>🔒 상세 증상 기록이나 메모는 공유되지 않습니다. 관계 기록의 메모도 표시되지 않습니다.</p>
      </div>
    </div>
  )
}
