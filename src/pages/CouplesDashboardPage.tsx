import { useMemo, useState } from 'react'
import { differenceInDays, format, parseISO, subMonths, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { usePartnerData } from '@/hooks/usePartnerData'
import { useIntimacy } from '@/hooks/useIntimacy'
import { getCycleDay, getCyclePhaseInfo, isDateInFertileWindow } from '@/lib/cycle'
import { PROTECTION_METHOD_LABELS } from '@/types'
import type { CyclePhase, ProtectionMethod } from '@/types'
import './CouplesDashboardPage.css'

const PHASE_META: Record<CyclePhase, { label: string; icon: string; color: string }> = {
  menstrual: { label: '생리기', icon: '🩸', color: 'var(--color-period)' },
  follicular: { label: '난포기', icon: '🌱', color: 'var(--color-success)' },
  ovulation: { label: '배란기', icon: '🥚', color: 'var(--color-ovulation)' },
  luteal: { label: '황체기', icon: '🌙', color: 'var(--color-primary)' },
}

function getProtectionLabel(key: string): string {
  if (key === 'none') return '미사용'
  if (key === 'condom' || key === 'pill' || key === 'iud' || key === 'other') {
    return PROTECTION_METHOD_LABELS[key]
  }
  return key
}

export function CouplesDashboardPage() {
  const { isLinked, isLoading, partnerName, partnerData } = usePartnerData()
  const { records: intimacyRecords, isLoading: intimacyLoading } = useIntimacy()
  const [pregnancyMode, setPregnancyMode] = useState(false)

  const prediction = partnerData?.prediction ?? null
  const cycleDay = partnerData?.cycleDay ?? null
  const phaseInfo = partnerData?.phaseInfo ?? null
  const avgCycleLength = prediction?.averageCycleLength ?? 28
  const periods = partnerData?.periods ?? []

  // Days until next period
  const daysUntilPeriod = useMemo(() => {
    if (!prediction) return null
    return differenceInDays(prediction.nextPeriodDate, new Date())
  }, [prediction])

  // Intimacy count since last period start
  const intimacyThisCycle = useMemo(() => {
    if (periods.length === 0) return 0
    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )
    const lastStart = sorted[0].start_date
    return intimacyRecords.filter(r => r.date >= lastStart).length
  }, [periods, intimacyRecords])

  // Monthly trend (last 6 months, horizontal bars)
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const result: { key: string; label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const month = startOfMonth(subMonths(now, i))
      const key = format(month, 'yyyy-MM')
      const label = format(month, 'M월', { locale: ko })
      const count = intimacyRecords.filter(r => r.date.startsWith(key)).length
      result.push({ key, label, count })
    }
    return result
  }, [intimacyRecords])

  // Phase distribution (all 4 phases)
  const phaseDistribution = useMemo(() => {
    const counts: Record<CyclePhase, number> = {
      menstrual: 0,
      follicular: 0,
      ovulation: 0,
      luteal: 0,
    }
    if (periods.length === 0) return counts
    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )
    for (const rec of intimacyRecords) {
      const recDate = parseISO(rec.date)
      const prev = sorted.find(p => parseISO(p.start_date) <= recDate)
      if (!prev) continue
      const day = getCycleDay(parseISO(prev.start_date), recDate)
      const info = getCyclePhaseInfo(day, avgCycleLength)
      counts[info.phase]++
    }
    return counts
  }, [intimacyRecords, periods, avgCycleLength])

  // Protection stats (condom / pill / iud / other / none)
  const protectionStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of intimacyRecords) {
      if (r.protection_used === true) {
        const method: ProtectionMethod = r.protection_method ?? 'other'
        counts[method] = (counts[method] ?? 0) + 1
      } else if (r.protection_used === false) {
        counts['none'] = (counts['none'] ?? 0) + 1
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: getProtectionLabel(key),
        count,
        pct: Math.round((count / total) * 100),
      }))
  }, [intimacyRecords])

  // Pregnancy planning data
  const pregnancyData = useMemo(() => {
    if (!prediction) return null
    const now = new Date()
    let ov = prediction.ovulationDate
    let fStart = prediction.fertileWindowStart
    let fEnd = prediction.fertileWindowEnd
    // If current cycle ovulation is past, find next future cycle
    if (differenceInDays(ov, now) < -1) {
      const next = prediction.futureCycles.find(
        c => differenceInDays(c.ovulationDate, now) >= -1
      )
      if (next) {
        ov = next.ovulationDate
        fStart = next.fertileWindowStart
        fEnd = next.fertileWindowEnd
      }
    }
    return {
      fertileStart: format(fStart, 'M월 d일', { locale: ko }),
      fertileEnd: format(fEnd, 'M월 d일', { locale: ko }),
      ovulationLabel: format(ov, 'M월 d일', { locale: ko }),
      daysUntilOvulation: differenceInDays(ov, now),
      isInFertileWindow: isDateInFertileWindow(now, prediction),
    }
  }, [prediction])

  // Loading
  if (isLoading || intimacyLoading) {
    return (
      <div className="couples-dashboard">
        <div className="cd-loading">로딩 중...</div>
      </div>
    )
  }

  // Empty state
  if (!isLinked || !partnerData) {
    return (
      <div className="couples-dashboard">
        <div className="cd-empty">
          <span className="cd-empty-icon">💑</span>
          <h2>파트너 연결이 필요해요</h2>
          <p>
            파트너와 연결하면 함께 주기 분석과
            <br />
            임신 계획을 세울 수 있어요.
          </p>
        </div>
      </div>
    )
  }

  const maxMonthly = Math.max(...monthlyTrend.map(m => m.count), 1)
  const phaseTotal = Object.values(phaseDistribution).reduce((a, b) => a + b, 0)

  return (
    <div className="couples-dashboard">
      {/* 1. Cycle Summary */}
      <section className="cd-section">
        <h3 className="cd-section-title">
          💑 {partnerName ? `${partnerName}의 ` : ''}주기 요약
        </h3>
        <div className="cd-summary-grid">
          <div className="cd-summary-card">
            <span className="cd-summary-value" style={{ color: phaseInfo?.color }}>
              {cycleDay ?? '—'}
              <span className="cd-summary-unit">/{avgCycleLength}일</span>
            </span>
            <span className="cd-summary-label">주기 Day</span>
          </div>
          <div className="cd-summary-card">
            <span className="cd-summary-value">{intimacyThisCycle}회</span>
            <span className="cd-summary-label">이번 주기 관계</span>
          </div>
          <div className="cd-summary-card">
            <span className="cd-summary-value">
              {daysUntilPeriod !== null && daysUntilPeriod >= 0
                ? `D-${daysUntilPeriod}`
                : '—'}
            </span>
            <span className="cd-summary-label">다음 생리까지</span>
          </div>
        </div>
      </section>

      {/* 2. Monthly Trend — 6 months, horizontal bars */}
      <section className="cd-section">
        <h3 className="cd-section-title">📊 월별 추이</h3>
        <div className="cd-monthly-bars">
          {monthlyTrend.map((m, i) => (
            <div
              key={m.key}
              className="cd-bar-row"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="cd-bar-label">{m.label}</span>
              <div className="cd-bar-track">
                <div
                  className="cd-bar-fill"
                  style={{ width: `${(m.count / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="cd-bar-count">{m.count}회</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Phase Distribution — 4 cards */}
      <section className="cd-section">
        <h3 className="cd-section-title">🔄 주기별 관계 분포</h3>
        <div className="cd-phase-grid">
          {(['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map(phase => {
            const meta = PHASE_META[phase]
            const count = phaseDistribution[phase]
            const pct = phaseTotal > 0 ? Math.round((count / phaseTotal) * 100) : 0
            return (
              <div
                key={phase}
                className="cd-phase-card"
                style={{ borderTopColor: meta.color }}
              >
                <span className="cd-phase-icon">{meta.icon}</span>
                <span className="cd-phase-name">{meta.label}</span>
                <span className="cd-phase-count">{count}회</span>
                {phaseTotal > 0 && (
                  <span className="cd-phase-pct" style={{ color: meta.color }}>
                    {pct}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Protection Stats */}
      {protectionStats.length > 0 && (
        <section className="cd-section">
          <h3 className="cd-section-title">🛡️ 피임 통계</h3>
          <div className="cd-protection-bars">
            {protectionStats.map(s => (
              <div key={s.key} className="cd-prot-row">
                <span className="cd-prot-label">{s.label}</span>
                <div className="cd-prot-track">
                  <div
                    className="cd-prot-fill"
                    data-method={s.key}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="cd-prot-pct">{s.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Pregnancy Planning */}
      <section className={`cd-section${pregnancyMode ? ' cd-section--pregnancy' : ''}`}>
        <div className="cd-pregnancy-header">
          <h3 className="cd-section-title" style={{ marginBottom: 0 }}>
            🤰 임신 계획 모드
          </h3>
          <button
            className={`cd-toggle${pregnancyMode ? ' cd-toggle--on' : ''}`}
            onClick={() => setPregnancyMode(v => !v)}
            aria-label="임신 계획 모드 토글"
          >
            <span className="cd-toggle-thumb" />
          </button>
        </div>

        {pregnancyMode && pregnancyData && (
          <div className="cd-pregnancy-body">
            <div className="cd-fertility-grid">
              <div className="cd-fertility-card">
                <span className="cd-fertility-icon">🌸</span>
                <span className="cd-fertility-label">가임기</span>
                <span className="cd-fertility-dates">
                  {pregnancyData.fertileStart} ~ {pregnancyData.fertileEnd}
                </span>
              </div>
              <div className="cd-fertility-card cd-fertility-card--ov">
                <span className="cd-fertility-icon">🥚</span>
                <span className="cd-fertility-label">배란일까지</span>
                <span className="cd-fertility-countdown">
                  {pregnancyData.daysUntilOvulation > 0
                    ? `D-${pregnancyData.daysUntilOvulation}`
                    : pregnancyData.daysUntilOvulation === 0
                      ? '오늘!'
                      : `${Math.abs(pregnancyData.daysUntilOvulation)}일 전`}
                </span>
              </div>
            </div>

            {pregnancyData.isInFertileWindow && (
              <div className="cd-fertile-alert">✨ 지금은 가임기입니다!</div>
            )}

            <div className="cd-pregnancy-tip">
              <span className="cd-tip-icon">💡</span>
              <p>
                임신 확률을 높이려면 배란일 전후로 <strong>2~3일 간격</strong>으로
                관계를 갖는 것이 좋습니다. 정자는 체내에서 최대 5일까지 생존할 수
                있어요.
              </p>
            </div>
          </div>
        )}

        {pregnancyMode && !pregnancyData && (
          <p className="cd-no-prediction">파트너의 주기 예측 데이터가 필요합니다.</p>
        )}
      </section>
    </div>
  )
}
