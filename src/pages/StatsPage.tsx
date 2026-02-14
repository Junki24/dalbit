import { useMemo } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useAuth } from '@/contexts/AuthContext'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { generatePdfReport } from '@/lib/pdf-export'
import { SYMPTOM_LABELS, SYMPTOM_ICONS } from '@/types'
import type { SymptomType, Period } from '@/types'
import './StatsPage.css'

interface CycleHistory {
  startDate: string
  endDate: string | null
  cycleLength: number | null
  periodLength: number | null
}

export function StatsPage() {
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const { userSettings } = useAuth()
  const { prediction } = useCyclePrediction(periods)

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

          {/* Cycle History */}
          <div className="stats-section">
            <h3 className="stats-section-title">📅 주기 기록</h3>
            <div className="cycle-history">
              {cycleHistory.slice(0, 12).map((cycle) => (
                <div key={cycle.startDate} className="history-item">
                  <div className="history-date">
                    {format(parseISO(cycle.startDate), 'M/d', { locale: ko })}
                    {cycle.endDate && (
                      <> ~ {format(parseISO(cycle.endDate), 'M/d', { locale: ko })}</>
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
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="export-buttons">
            <button className="btn-csv-export" onClick={handleExportCsv}>
              📊 CSV 내보내기
            </button>
            <button
              className="btn-csv-export"
              onClick={() => generatePdfReport({ periods, symptoms, userSettings })}
            >
              🖨️ PDF 리포트
            </button>
          </div>
        </>
      )}
    </div>
  )
}
