import { useCallback, memo } from 'react'
import { differenceInDays, format, parseISO, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usePartnerData } from '@/hooks/usePartnerData'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PARTNER_CARE_TIPS, SYMPTOM_ICONS, SYMPTOM_LABELS } from '@/types'
import type { Symptom } from '@/types'
import './PartnerPage.css'

function getDDayColor(days: number | null): string {
  if (days === null || days < 0) return 'var(--color-text-muted)'
  if (days <= 3) return '#ef4444'
  if (days <= 7) return '#eab308'
  return '#22c55e'
}

/* ── Memo'd sub-components to prevent animation restart on re-render ── */

const PartnerDDayRow = memo(function PartnerDDayRow({
  daysUntilNextPeriod,
  daysUntilOvulation,
}: {
  daysUntilNextPeriod: number | null
  daysUntilOvulation: number | null
}) {
  return (
    <div className="partner-dday-row">
      <div
        className="partner-dday"
        style={{ '--dday-accent': getDDayColor(daysUntilNextPeriod) } as React.CSSProperties}
      >
        <span className="partner-dday-icon">🩸</span>
        <span className="partner-dday-text">
          {daysUntilNextPeriod !== null && daysUntilNextPeriod >= 0
            ? `D-${daysUntilNextPeriod} 다음 생리까지`
            : '예측 기간 지남'}
        </span>
      </div>
      <div className="partner-dday partner-dday--ovulation">
        <span className="partner-dday-icon">🥚</span>
        <span className="partner-dday-text">
          {daysUntilOvulation !== null && daysUntilOvulation >= 0
            ? `배란일 D-${daysUntilOvulation}`
            : '배란 예측 없음'}
        </span>
      </div>
    </div>
  )
})

const PartnerCycleCircle = memo(function PartnerCycleCircle({
  cycleDay,
  phaseColor,
}: {
  cycleDay: number | null
  phaseColor: string
}) {
  return (
    <div className="partner-cycle-circle">
      <div
        className="partner-circle-inner"
        style={{ borderColor: phaseColor }}
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
  )
})

export function PartnerPage() {
  const { user, userSettings, updateUserSettings } = useAuth()
  const navigate = useNavigate()
  const { isLinked, isLoading, partnerName, partnerData } = usePartnerData()
  const showPregnancyBanner = userSettings?.pregnancy_mode ?? false
  const togglePregnancyBanner = useCallback(() => {
    updateUserSettings({ pregnancy_mode: !showPregnancyBanner })
  }, [showPregnancyBanner, updateUserSettings])

  // Derive all values BEFORE conditional returns (React Rules of Hooks)
  const partnerPeriods = partnerData?.periods ?? []
  const lastPeriodStart = partnerPeriods.length > 0
    ? [...partnerPeriods].sort((a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime())[0].start_date
    : null

  const prediction = partnerData?.prediction ?? null
  const cycleDay = partnerData?.cycleDay ?? null
  const phaseInfo = partnerData?.phaseInfo ?? null
  const ownerUserId = partnerData?.ownerSettings?.user_id ?? null

  const daysUntilNextPeriod = prediction
    ? differenceInDays(prediction.nextPeriodDate, new Date())
    : null
  const daysUntilOvulation = prediction
    ? differenceInDays(prediction.ovulationDate, new Date())
    : null

  // Existing intimacy query — PRESERVED
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

  // Partner symptoms — last 2 days (D)
  const { data: partnerSymptoms = [] } = useQuery({
    queryKey: ['partner-symptoms', ownerUserId],
    queryFn: async (): Promise<Symptom[]> => {
      if (!ownerUserId || !isSupabaseConfigured) return []
      const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', ownerUserId)
        .gte('date', twoDaysAgo)
        .order('date', { ascending: false })
      if (error) return []
      return (data ?? []) as Symptom[]
    },
    enabled: Boolean(ownerUserId) && isSupabaseConfigured && isLinked,
    staleTime: 5 * 60 * 1000,
  })

  // === ALL HOOKS ABOVE — conditional returns below ===

  if (isLoading) {
    return (
      <div className="partner-page" aria-busy="true" aria-label="파트너 데이터 로딩 중">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div className="skeleton" style={{ height: '40px', width: '60%', borderRadius: 'var(--radius-md)' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton" style={{ height: '48px', flex: 1, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '48px', flex: 1, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <div className="skeleton" style={{ height: '140px', width: '140px', borderRadius: '50%' }} />
          </div>
          <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton" style={{ height: '56px', flex: 1, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '56px', flex: 1, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '56px', flex: 1, borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </div>
    )
  }

  // (A) Not linked — onboarding steps
  if (!isLinked) {
    return (
      <div className="partner-page">
        <div className="partner-empty">
          <span className="partner-empty-icon">💑</span>
          <h2>파트너와 연결해보세요</h2>
          <p>설정에서 초대 링크를 생성하거나<br />파트너의 링크를 입력해주세요.</p>

          <div className="partner-onboarding-steps">
            <div className="partner-step">
              <span className="partner-step-num">1</span>
              <div className="partner-step-content">
                <strong>초대 코드 받기</strong>
                <span>파트너에게 초대 코드를 요청하세요</span>
              </div>
            </div>
            <div className="partner-step">
              <span className="partner-step-num">2</span>
              <div className="partner-step-content">
                <strong>코드 입력하기</strong>
                <span>설정에서 파트너 코드를 입력해요</span>
              </div>
            </div>
            <div className="partner-step">
              <span className="partner-step-num">3</span>
              <div className="partner-step-content">
                <strong>함께 확인하기</strong>
                <span>주기 · 컨디션 · 케어 팁을 실시간으로!</span>
              </div>
            </div>
          </div>

          <button
            className="partner-empty-btn"
            onClick={() => navigate('/settings')}
          >
            설정에서 연결하기
          </button>
        </div>
      </div>
    )
  }

  // (A-2) Linked but partner data unavailable
  if (!partnerData) {
    return (
      <div className="partner-page">
        <div className="partner-empty">
          <span className="partner-empty-icon">⚠️</span>
          <h2>파트너 데이터를 불러올 수 없어요</h2>
          <p>파트너가 아직 주기 데이터를 입력하지 않았거나<br />일시적인 연결 문제일 수 있어요.</p>
          <button
            className="partner-empty-btn"
            onClick={() => window.location.reload()}
          >
            다시 시도하기
          </button>
        </div>
      </div>
    )
  }

  // Derived values for linked state
  const currentPhase = phaseInfo?.phase
  const careTips = currentPhase ? PARTNER_CARE_TIPS[currentPhase] : []

  // Deduplicate symptoms by type
  const uniqueSymptoms = partnerSymptoms.reduce<Symptom[]>((acc, s) => {
    if (!acc.find(existing => existing.symptom_type === s.symptom_type)) acc.push(s)
    return acc
  }, [])

  // Fertile window logic for pregnancy banner (F)
  const isInFertileWindow = prediction
    ? differenceInDays(new Date(), prediction.fertileWindowStart) >= 0 &&
      differenceInDays(prediction.fertileWindowEnd, new Date()) >= 0
    : false
  const daysUntilFertileStart = prediction
    ? differenceInDays(prediction.fertileWindowStart, new Date())
    : null

  return (
    <div className="partner-page">
      {/* Header */}
      <div className="partner-header">
        <span className="partner-avatar">💑</span>
        <h2>{partnerName ?? '파트너'}의 주기</h2>
      </div>

      {/* (B) D-Day Counters — above cycle circle */}
      <PartnerDDayRow daysUntilNextPeriod={daysUntilNextPeriod} daysUntilOvulation={daysUntilOvulation} />

      {/* Cycle Day Circle */}
      <PartnerCycleCircle cycleDay={cycleDay} phaseColor={phaseInfo?.color ?? 'var(--color-primary)'} />

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

      {/* (C) Care Tips — below phase card */}
      {careTips.length > 0 && (
        <div className="partner-care-section">
          <h3 className="partner-section-title">💝 케어 가이드</h3>
          <div className="partner-care-list">
            {careTips.map((tip, i) => (
              <div key={i} className="partner-care-item">
                <span className="partner-care-emoji">{tip.emoji}</span>
                <div className="partner-care-text">
                  <strong>{tip.title}</strong>
                  <span>{tip.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* (D) Partner Symptoms — last 2 days as emoji tags */}
      {uniqueSymptoms.length > 0 && (
        <div className="partner-symptoms-section">
          <h3 className="partner-section-title">📋 최근 증상 (2일)</h3>
          <div className="partner-symptom-tags">
            {uniqueSymptoms.map((s) => (
              <span key={s.id} className="partner-symptom-tag">
                <span className="partner-symptom-tag-icon">{SYMPTOM_ICONS[s.symptom_type]}</span>
                {SYMPTOM_LABELS[s.symptom_type]}
              </span>
            ))}
          </div>
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

      {/* Intimacy in current cycle — PRESERVED */}
      {lastPeriodStart && (
        <div className="partner-pred-card" style={{ marginTop: 8 }}>
          <span className="partner-pred-icon">💜</span>
          <span className="partner-pred-label">이번 주기 관계</span>
          <span className="partner-pred-value">
            {partnerIntimacyCount > 0 ? `${partnerIntimacyCount}회 기록됨` : '기록 없음'}
          </span>
        </div>
      )}

      {/* (F) Pregnancy Banner — toggle with green accent */}
      <div className="partner-pregnancy-section">
        <button
          className={`partner-pregnancy-toggle${showPregnancyBanner ? ' partner-pregnancy-toggle--active' : ''}`}
          onClick={togglePregnancyBanner}
          role="switch"
          aria-checked={showPregnancyBanner}
          aria-label="임신 계획 모드 토글"
        >
          <span>🤰</span>
          <span>임신 계획 모드</span>
          <span className="partner-toggle-chevron">{showPregnancyBanner ? '▲' : '▼'}</span>
        </button>
        {showPregnancyBanner && prediction && (
          <div className="partner-pregnancy-banner">
            <div className="partner-pregnancy-row">
              <div className="partner-pregnancy-item">
                <span className="partner-pregnancy-label">🌿 가임기</span>
                <span className="partner-pregnancy-value">
                  {format(prediction.fertileWindowStart, 'M/d')} ~ {format(prediction.fertileWindowEnd, 'M/d')}
                </span>
                {isInFertileWindow ? (
                  <span className="partner-pregnancy-badge partner-pregnancy-badge--active">지금 가임기!</span>
                ) : daysUntilFertileStart !== null && daysUntilFertileStart > 0 ? (
                  <span className="partner-pregnancy-badge">{daysUntilFertileStart}일 후 시작</span>
                ) : null}
              </div>
              <div className="partner-pregnancy-item">
                <span className="partner-pregnancy-label">🥚 배란 예정</span>
                <span className="partner-pregnancy-value">
                  {format(prediction.ovulationDate, 'M월 d일', { locale: ko })}
                </span>
                {daysUntilOvulation !== null && daysUntilOvulation >= 0 && (
                  <span className="partner-pregnancy-badge">D-{daysUntilOvulation}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* (E) Quick Actions */}
      <div className="partner-quick-actions">
        <button className="partner-action-btn" onClick={() => navigate('/partner-record')} aria-label="관계 기록하기 페이지로 이동">
          <span className="partner-action-icon">📝</span>
          <span className="partner-action-label">기록하기</span>
        </button>
        <button className="partner-action-btn" onClick={() => navigate('/partner-calendar')} aria-label="파트너 캘린더 페이지로 이동">
          <span className="partner-action-icon">📅</span>
          <span className="partner-action-label">캘린더</span>
        </button>
        <button className="partner-action-btn" onClick={() => navigate('/couples')} aria-label="커플 대시보드로 이동">
          <span className="partner-action-icon">💕</span>
          <span className="partner-action-label">커플</span>
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="partner-privacy">
        <p>🔒 상세 증상 기록이나 메모는 공유되지 않습니다. 관계 기록의 메모도 표시되지 않습니다.</p>
      </div>
    </div>
  )
}
