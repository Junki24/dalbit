import { useMemo, useState } from 'react'
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useSymptomPatterns } from '@/hooks/useSymptomPatterns'
import { useMedicationIntakes } from '@/hooks/useMedications'
import { useIntimacy } from '@/hooks/useIntimacy'
import { useAuth } from '@/contexts/AuthContext'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { isDateInFertileWindow } from '@/lib/cycle'
import { generatePdfReport } from '@/lib/pdf-export'
import { SYMPTOM_LABELS, SYMPTOM_ICONS, PROTECTION_METHOD_LABELS, TIME_OF_DAY_LABELS } from '@/types'
import type { SymptomType, CyclePhase, Period, ProtectionMethod, TimeOfDay } from '@/types'
import './StatsPage.css'

interface CycleHistory {
  startDate: string
  endDate: string | null
  cycleLength: number | null
  periodLength: number | null
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: '생리기',
  follicular: '난포기',
  ovulation: '배란기',
  luteal: '황체기',
}

export function StatsPage() {
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const { intakes: medicationIntakes } = useMedicationIntakes()
  const { userSettings } = useAuth()
  const [showAllCycles, setShowAllCycles] = useState(false)
  const { prediction } = useCyclePrediction(periods)
  const avgCycleLength = prediction?.averageCycleLength ?? userSettings?.average_cycle_length ?? 28
  const symptomPatterns = useSymptomPatterns(periods, symptoms, avgCycleLength)
  const { records: intimacyRecords } = useIntimacy()

  // ── Intimacy stats ──
  const intimacyMonthly = useMemo(() => {
    const months = new Map<string, number>()
    for (const r of intimacyRecords) {
      const month = r.date.substring(0, 7)
      months.set(month, (months.get(month) ?? 0) + 1)
    }
    return [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({
        month: format(parseISO(month + '-01'), 'M월', { locale: ko }),
        count,
      }))
  }, [intimacyRecords])

  const intimacyCyclePhase = useMemo(() => {
    if (periods.length === 0 || intimacyRecords.length === 0) return []
    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )
    const phaseCounts: Record<CyclePhase, number> = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 }
    const ovulationDay = avgCycleLength - 14

    for (const rec of intimacyRecords) {
      const recDate = parseISO(rec.date)
      // Find most recent period start before this record
      const prevPeriod = sorted.find((p) => parseISO(p.start_date) <= recDate)
      if (!prevPeriod) continue
      const cycleDay = differenceInDays(recDate, parseISO(prevPeriod.start_date)) + 1
      if (cycleDay <= 5) phaseCounts.menstrual++
      else if (cycleDay <= ovulationDay - 5) phaseCounts.follicular++
      else if (cycleDay <= ovulationDay + 1) phaseCounts.ovulation++
      else phaseCounts.luteal++
    }

    const total = Object.values(phaseCounts).reduce((a, b) => a + b, 0)
    return (['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[])
      .map((phase) => ({
        phase,
        count: phaseCounts[phase],
        pct: total > 0 ? Math.round((phaseCounts[phase] / total) * 100) : 0,
      }))
      .filter((p) => p.count > 0)
  }, [intimacyRecords, periods, avgCycleLength])

  const intimacyProtectionStats = useMemo(() => {
    const total = intimacyRecords.length
    const protectedCount = intimacyRecords.filter((r) => r.protection_used === true).length
    const unprotectedCount = intimacyRecords.filter((r) => r.protection_used === false).length
    const byMethod = new Map<ProtectionMethod, number>()
    for (const r of intimacyRecords) {
      if (r.protection_used && r.protection_method) {
        byMethod.set(r.protection_method, (byMethod.get(r.protection_method) ?? 0) + 1)
      }
    }
    return {
      total,
      protectedCount,
      unprotectedCount,
      rate: total > 0 ? Math.round((protectedCount / total) * 100) : 0,
      byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    }
  }, [intimacyRecords])

  const intimacyFertileOverlap = useMemo(() => {
    if (!prediction || intimacyRecords.length === 0) return { total: 0, duringFertile: 0, pct: 0 }
    const duringFertile = intimacyRecords.filter((r) =>
      isDateInFertileWindow(parseISO(r.date), prediction)
    ).length
    return {
      total: intimacyRecords.length,
      duringFertile,
      pct: intimacyRecords.length > 0 ? Math.round((duringFertile / intimacyRecords.length) * 100) : 0,
    }
  }, [intimacyRecords, prediction])

  const currentMonthIntimacy = useMemo(() => {
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    return intimacyRecords.filter((r) => r.date >= monthStart && r.date <= monthEnd).length
  }, [intimacyRecords])

  // Calculate cycle history
  const cycleHistory = useMemo((): CycleHistory[] => {
    if (periods.length === 0) return []
    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )

    return sorted.map((period, i) => {
      const nextPeriod = sorted[i + 1] as Period | undefined
      const cycleLength = nextPeriod
        ? differenceInDays(parseISO(period.start_date), parseISO(nextPeriod.start_date))
        : null

      const periodLength = period.end_date
        ? differenceInDays(parseISO(period.end_date), parseISO(period.start_date)) + 1
        : null

      return {
        startDate: period.start_date,
        endDate: period.end_date,
        cycleLength,
        periodLength,
      }
    })
  }, [periods])

  // Cycle stats
  const cycleStats = useMemo(() => {
    const lengths = cycleHistory
      .map((c) => c.cycleLength)
      .filter((v): v is number => v !== null && v > 0 && v < 60)

    if (lengths.length === 0) return null

    const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    const min = Math.min(...lengths)
    const max = Math.max(...lengths)
    const variation = max - min

    return { avg, min, max, variation, count: lengths.length }
  }, [cycleHistory])

  // Period length stats
  const periodStats = useMemo(() => {
    const lengths = cycleHistory
      .map((c) => c.periodLength)
      .filter((v): v is number => v !== null && v > 0)

    if (lengths.length === 0) return null

    const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length * 10) / 10

    return { avg, count: lengths.length }
  }, [cycleHistory])

  // Top symptoms
  const topSymptoms = useMemo(() => {
    const counts = new Map<SymptomType, number>()
    for (const s of symptoms) {
      const type = s.symptom_type as SymptomType
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))
  }, [symptoms])

  // Monthly symptom trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = new Map<string, number>()
    for (const s of symptoms) {
      const month = s.date.substring(0, 7) // YYYY-MM
      months.set(month, (months.get(month) ?? 0) + 1)
    }

    return [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({
        month: format(parseISO(month + '-01'), 'M월', { locale: ko }),
        count,
      }))
  }, [symptoms])

  // Symptom correlation: which symptoms frequently appear together
  const symptomCorrelations = useMemo(() => {
    // Group symptoms by date
    const byDate = new Map<string, SymptomType[]>()
    for (const s of symptoms) {
      const types = byDate.get(s.date) ?? []
      types.push(s.symptom_type as SymptomType)
      byDate.set(s.date, types)
    }

    // Count co-occurrences
    const pairs = new Map<string, number>()
    for (const types of byDate.values()) {
      if (types.length < 2) continue
      const unique = [...new Set(types)].sort()
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          const key = `${unique[i]}|${unique[j]}`
          pairs.set(key, (pairs.get(key) ?? 0) + 1)
        }
      }
    }

    return [...pairs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [a, b] = key.split('|') as [SymptomType, SymptomType]
        return { a, b, count }
      })
  }, [symptoms])

  // Symptom severity average by type
  const severityByType = useMemo(() => {
    const map = new Map<SymptomType, { total: number; count: number }>()
    for (const s of symptoms) {
      const type = s.symptom_type as SymptomType
      const entry = map.get(type) ?? { total: 0, count: 0 }
      entry.total += s.severity
      entry.count += 1
      map.set(type, entry)
    }

    return [...map.entries()]
      .map(([type, { total, count }]) => ({
        type,
        avgSeverity: Math.round((total / count) * 10) / 10,
        count,
      }))
      .sort((a, b) => b.avgSeverity - a.avgSeverity)
      .slice(0, 5)
  }, [symptoms])

  // CSV export helper
  const handleExportCsv = () => {
    const rows: string[] = []

    // Periods CSV
    rows.push('=== 생리 기록 ===')
    rows.push('시작일,종료일,주기길이,생리기간')
    for (const c of cycleHistory) {
      rows.push([
        c.startDate,
        c.endDate ?? '',
        c.cycleLength?.toString() ?? '',
        c.periodLength?.toString() ?? '',
      ].join(','))
    }

    rows.push('')
    rows.push('=== 증상 기록 ===')
    rows.push('날짜,증상,심각도,메모')
    for (const s of symptoms) {
      const label = SYMPTOM_LABELS[s.symptom_type as SymptomType] ?? s.symptom_type
      rows.push([
        s.date,
        label,
        s.severity.toString(),
        (s.notes ?? '').replace(/,/g, ' '),
      ].join(','))
    }

    if (intimacyRecords.length > 0) {
      rows.push('')
      rows.push('=== 관계 기록 ===')
      rows.push('날짜,시간대,피임여부,피임방법,메모')
      for (const r of intimacyRecords) {
        rows.push([
          r.date,
          r.time_of_day ? TIME_OF_DAY_LABELS[r.time_of_day as TimeOfDay] : '',
          r.protection_used === true ? '사용' : r.protection_used === false ? '미사용' : '',
          r.protection_method ? PROTECTION_METHOD_LABELS[r.protection_method as ProtectionMethod] : '',
          (r.note ?? '').replace(/,/g, ' '),
        ].join(','))
      }
    }

    const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dalbit-stats-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasData = periods.length > 0

  return (
    <div className="stats-page">
      {!hasData ? (
        <div className="stats-empty">
          <span className="stats-empty-icon">📊</span>
          <h2>데이터가 필요합니다</h2>
          <p>생리와 증상을 기록하면 여기서 통계를 확인할 수 있어요.</p>
        </div>
      ) : (
        <>
          {/* Symptom Pattern Analysis */}
          <div className="stats-section">
            <h3 className="stats-section-title">🔮 증상 패턴 분석</h3>
            {symptomPatterns.length > 0 ? (
              <div className="pattern-list">
                {symptomPatterns.slice(0, 8).map((p) => (
                  <div key={`${p.symptomType}-${p.phase}`} className="pattern-item">
                    <div className="pattern-symptom">
                      <span className="pattern-icon">{SYMPTOM_ICONS[p.symptomType]}</span>
                      <span className="pattern-name">{SYMPTOM_LABELS[p.symptomType]}</span>
                    </div>
                    <span className={`pattern-phase-badge pattern-phase--${p.phase}`}>
                      {PHASE_LABELS[p.phase]}
                    </span>
                    <span className="pattern-stats">
                      {Math.round(p.probability * 100)}% · {p.lift.toFixed(1)}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="stats-note" style={{ marginTop: 0 }}>
                증상 패턴 분석에는 최소 3회 이상의 주기와 10일 이상의 증상 기록이 필요합니다. 꾸준히 기록해 주세요!
              </p>
            )}
          </div>

          {/* Cycle Overview */}
          <div className="stats-section">
            <h3 className="stats-section-title">🔄 주기 분석</h3>
            {cycleStats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{cycleStats.avg}일</span>
                  <span className="stat-label">평균 주기</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{cycleStats.min}~{cycleStats.max}일</span>
                  <span className="stat-label">주기 범위</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{cycleStats.variation}일</span>
                  <span className="stat-label">주기 변동폭</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{cycleStats.count}회</span>
                  <span className="stat-label">기록된 주기</span>
                </div>
              </div>
            ) : (
              <p className="stats-note">주기 분석에는 최소 2회 이상의 기록이 필요합니다.</p>
            )}
          </div>

          {/* Period Length */}
          {periodStats && (
            <div className="stats-section">
              <h3 className="stats-section-title">🩸 생리 기간</h3>
              <div className="stats-grid stats-grid--2">
                <div className="stat-card">
                  <span className="stat-value">{periodStats.avg}일</span>
                  <span className="stat-label">평균 생리 기간</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{periodStats.count}회</span>
                  <span className="stat-label">종료일 기록</span>
                </div>
              </div>
            </div>
          )}

          {/* Prediction Confidence */}
          {prediction && (
            <div className="stats-section">
              <h3 className="stats-section-title">🎯 예측 신뢰도</h3>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  data-level={prediction.confidence}
                  style={{
                    width: prediction.confidence === 'high' ? '100%'
                      : prediction.confidence === 'medium' ? '66%'
                      : '33%',
                  }}
                />
              </div>
              <div className="confidence-labels">
                <span className={prediction.confidence === 'low' ? 'active' : ''}>낮음</span>
                <span className={prediction.confidence === 'medium' ? 'active' : ''}>보통</span>
                <span className={prediction.confidence === 'high' ? 'active' : ''}>높음</span>
              </div>
              <p className="stats-note">
                {prediction.confidence === 'high'
                  ? '6회 이상의 기록으로 높은 정확도의 예측이 가능합니다.'
                  : prediction.confidence === 'medium'
                  ? '3~5회 기록으로 보통 수준의 예측이 가능합니다. 더 많은 기록이 쌓이면 정확도가 올라갑니다.'
                  : '기록이 부족하여 예측 정확도가 낮습니다. 생리를 계속 기록해 주세요.'}
              </p>
            </div>
          )}

          {/* Top Symptoms */}
          {topSymptoms.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">📝 자주 기록한 증상</h3>
              <div className="symptom-ranking">
                {topSymptoms.map((s, i) => (
                  <div key={s.type} className="symptom-rank-item">
                    <span className="rank-number">{i + 1}</span>
                    <span className="rank-icon">{SYMPTOM_ICONS[s.type]}</span>
                    <span className="rank-name">{SYMPTOM_LABELS[s.type]}</span>
                    <span className="rank-count">{s.count}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Trend */}
          {monthlyTrend.length > 1 && (
            <div className="stats-section">
              <h3 className="stats-section-title">📈 월별 증상 기록</h3>
              <div className="trend-chart">
                {monthlyTrend.map((m) => {
                  const maxCount = Math.max(...monthlyTrend.map((x) => x.count))
                  const height = maxCount > 0 ? (m.count / maxCount) * 100 : 0
                  return (
                    <div key={m.month} className="trend-bar-wrapper">
                      <span className="trend-count">{m.count}</span>
                      <div className="trend-bar" style={{ height: `${Math.max(4, height)}%` }} />
                      <span className="trend-month">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Symptom Severity */}
          {severityByType.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">🌡️ 증상 심각도 순위</h3>
              <p className="stats-note" style={{ marginTop: 0, marginBottom: 12 }}>
                평균 심각도가 높은 증상 (1~5 기준)
              </p>
              <div className="severity-ranking">
                {severityByType.map((s) => (
                  <div key={s.type} className="severity-item">
                    <span className="severity-icon">{SYMPTOM_ICONS[s.type]}</span>
                    <span className="severity-name">{SYMPTOM_LABELS[s.type]}</span>
                    <div className="severity-bar-bg">
                      <div
                        className="severity-bar-fill"
                        style={{ width: `${(s.avgSeverity / 5) * 100}%` }}
                      />
                    </div>
                    <span className="severity-value">{s.avgSeverity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symptom Correlations */}
          {symptomCorrelations.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">🔗 함께 나타나는 증상</h3>
              <p className="stats-note" style={{ marginTop: 0, marginBottom: 12 }}>
                같은 날 자주 함께 기록된 증상 조합
              </p>
              <div className="correlation-list">
                {symptomCorrelations.map((c) => (
                  <div key={`${c.a}-${c.b}`} className="correlation-item">
                    <span className="correlation-pair">
                      <span>{SYMPTOM_ICONS[c.a]}</span>
                      <span className="correlation-name">{SYMPTOM_LABELS[c.a]}</span>
                      <span className="correlation-separator">+</span>
                      <span>{SYMPTOM_ICONS[c.b]}</span>
                      <span className="correlation-name">{SYMPTOM_LABELS[c.b]}</span>
                    </span>
                    <span className="correlation-count">{c.count}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intimacy Stats */}
          {intimacyRecords.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">💜 관계 분석</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{currentMonthIntimacy}회</span>
                  <span className="stat-label">이번 달</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{intimacyFertileOverlap.duringFertile}회</span>
                  <span className="stat-label">가임기 중 ({intimacyFertileOverlap.pct}%)</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{intimacyProtectionStats.rate}%</span>
                  <span className="stat-label">피임 사용률</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{intimacyRecords.length}회</span>
                  <span className="stat-label">전체 기록</span>
                </div>
              </div>

              {/* Monthly trend */}
              {intimacyMonthly.length > 1 && (
                <>
                  <h4 className="intimacy-sub-title">월별 추이</h4>
                  <div className="trend-chart">
                    {intimacyMonthly.map((m) => {
                      const maxCount = Math.max(...intimacyMonthly.map((x) => x.count))
                      const height = maxCount > 0 ? (m.count / maxCount) * 100 : 0
                      return (
                        <div key={m.month} className="trend-bar-wrapper">
                          <span className="trend-count">{m.count}</span>
                          <div className="trend-bar trend-bar--intimacy" style={{ height: `${Math.max(4, height)}%` }} />
                          <span className="trend-month">{m.month}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Cycle phase distribution */}
              {intimacyCyclePhase.length > 0 && (
                <>
                  <h4 className="intimacy-sub-title">주기별 분포</h4>
                  <div className="intimacy-phase-list">
                    {intimacyCyclePhase.map((p) => (
                      <div key={p.phase} className="intimacy-phase-item">
                        <span className={`pattern-phase-badge pattern-phase--${p.phase}`}>
                          {PHASE_LABELS[p.phase]}
                        </span>
                        <div className="intimacy-phase-bar-bg">
                          <div className="intimacy-phase-bar-fill" style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="intimacy-phase-stat">{p.count}회 ({p.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Protection method breakdown */}
              {intimacyProtectionStats.byMethod.length > 0 && (
                <>
                  <h4 className="intimacy-sub-title">피임 방법</h4>
                  <div className="intimacy-method-list">
                    {intimacyProtectionStats.byMethod.map(([method, count]) => (
                      <div key={method} className="intimacy-method-item">
                        <span className="intimacy-method-name">{PROTECTION_METHOD_LABELS[method]}</span>
                        <span className="intimacy-method-count">{count}회</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cycle History — Full List */}
          <div className="stats-section">
            <div className="stats-section-header">
              <h3 className="stats-section-title">📅 전체 생리 기록</h3>
              <span className="stats-section-count">{cycleHistory.length}건</span>
            </div>
            <div className="cycle-history">
              {(showAllCycles ? cycleHistory : cycleHistory.slice(0, 6)).map((cycle, i) => (
                <div key={cycle.startDate} className="history-item">
                  <span className="history-num">{cycleHistory.length - i}</span>
                  <div className="history-main">
                    <div className="history-date">
                      {format(parseISO(cycle.startDate), 'yyyy.M.d', { locale: ko })}
                      {cycle.endDate && (
                        <span className="history-date-end">
                          ~ {format(parseISO(cycle.endDate), 'M.d', { locale: ko })}
                        </span>
                      )}
                    </div>
                    <div className="history-details">
                      {cycle.periodLength && (
                        <span className="history-tag">{cycle.periodLength}일간</span>
                      )}
                      {cycle.cycleLength && (
                        <span className="history-tag history-tag--cycle">주기 {cycle.cycleLength}일</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cycleHistory.length > 6 && (
              <button
                className="history-show-more"
                onClick={() => setShowAllCycles(!showAllCycles)}
              >
                {showAllCycles ? '접기' : `전체 보기 (${cycleHistory.length}건)`}
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="export-buttons">
            <button className="btn-csv-export" onClick={handleExportCsv}>
              📊 CSV 내보내기
            </button>
            <button
              className="btn-csv-export"
              onClick={() => generatePdfReport({ periods, symptoms, userSettings, medicationIntakes, intimacyRecords })}
            >
              🖨️ PDF 리포트
            </button>
          </div>
        </>
      )}
    </div>
  )
}
