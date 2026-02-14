import { useMemo } from 'react'
import { parseISO, differenceInDays, format, subDays } from 'date-fns'
import type { Period, Symptom, SymptomType, CyclePrediction } from '@/types'
import { SYMPTOM_LABELS } from '@/types'

export interface Insight {
  id: string
  icon: string
  title: string
  description: string
  type: 'positive' | 'neutral' | 'warning' | 'info'
}

/**
 * Smart insights engine — analyzes period & symptom data
 * to generate personalized health insights.
 */
export function useInsights(
  periods: Period[],
  symptoms: Symptom[],
  prediction: CyclePrediction | null,
  cycleDay: number | null
): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = []

    // ── 1. Cycle regularity analysis ──
    if (periods.length >= 3) {
      const sorted = [...periods].sort(
        (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
      )
      const intervals: number[] = []
      for (let i = 0; i < sorted.length - 1 && i < 6; i++) {
        const diff = differenceInDays(
          parseISO(sorted[i].start_date),
          parseISO(sorted[i + 1].start_date)
        )
        if (diff > 0 && diff < 60) intervals.push(diff)
      }

      if (intervals.length >= 2) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const variance =
          intervals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / intervals.length
        const stdDev = Math.sqrt(variance)

        if (stdDev <= 2) {
          insights.push({
            id: 'cycle-regular',
            icon: '✨',
            title: '규칙적인 주기',
            description: `최근 ${intervals.length}회 주기가 매우 규칙적이에요 (편차 ${stdDev.toFixed(1)}일). 예측 정확도가 높습니다.`,
            type: 'positive',
          })
        } else if (stdDev > 5) {
          insights.push({
            id: 'cycle-irregular',
            icon: '📋',
            title: '주기 변동이 있어요',
            description: `최근 주기 변동이 큰 편이에요 (편차 ${stdDev.toFixed(1)}일). 꾸준히 기록하면 패턴을 파악할 수 있어요.`,
            type: 'warning',
          })
        }
      }
    }

    // ── 2. Pre-period symptom pattern detection ──
    if (symptoms.length > 0 && periods.length >= 2) {
      const sorted = [...periods].sort(
        (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
      )

      const preperiodCounts = new Map<SymptomType, number>()
      for (const period of sorted.slice(0, 6)) {
        const periodStart = parseISO(period.start_date)
        for (const symptom of symptoms) {
          const symptomDate = parseISO(symptom.date)
          const daysBefore = differenceInDays(periodStart, symptomDate)
          if (daysBefore >= 1 && daysBefore <= 3) {
            const type = symptom.symptom_type as SymptomType
            preperiodCounts.set(type, (preperiodCounts.get(type) ?? 0) + 1)
          }
        }
      }

      const frequent = [...preperiodCounts.entries()]
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])

      if (frequent.length > 0) {
        const [topType, topCount] = frequent[0]
        const name = SYMPTOM_LABELS[topType]
        insights.push({
          id: 'preperiod-pattern',
          icon: '🔮',
          title: '생리 전 패턴 감지',
          description: `'${name}'이(가) 생리 1~3일 전에 자주 나타나요 (${topCount}회). 이 증상이 나타나면 곧 생리가 시작될 수 있어요.`,
          type: 'info',
        })
      }
    }

    // ── 3. Phase-specific wellness tips ──
    if (cycleDay !== null && prediction) {
      const len = prediction.averageCycleLength

      if (cycleDay <= 5) {
        insights.push({
          id: 'phase-tip',
          icon: '🫖',
          title: '생리 중 셀프케어',
          description:
            '따뜻한 음료와 충분한 휴식이 도움이 됩니다. 철분이 풍부한 음식(시금치, 적색 육류)을 챙겨보세요.',
          type: 'neutral',
        })
      } else if (cycleDay <= len - 19) {
        insights.push({
          id: 'phase-tip',
          icon: '💪',
          title: '활력 충전 시기',
          description:
            '에스트로겐이 상승하는 난포기예요. 운동이나 새로운 도전에 가장 좋은 시기입니다.',
          type: 'positive',
        })
      } else if (cycleDay >= len - 5) {
        insights.push({
          id: 'phase-tip',
          icon: '🧘',
          title: '셀프케어 타임',
          description:
            '생리 전 시기예요. 스트레스 관리와 충분한 수면이 PMS 완화에 도움이 됩니다.',
          type: 'neutral',
        })
      } else if (cycleDay >= len - 19 && cycleDay <= len - 12) {
        insights.push({
          id: 'phase-tip',
          icon: '🥚',
          title: '배란기 정보',
          description:
            '배란 전후 시기입니다. 가임기이므로 임신 계획에 참고하세요.',
          type: 'info',
        })
      }
    }

    // ── 4. Recording streak ──
    if (symptoms.length > 0 || periods.length > 0) {
      const today = new Date()
      const recordedDates = new Set<string>()
      for (const s of symptoms) recordedDates.add(s.date)
      for (const p of periods) recordedDates.add(p.start_date)

      let streak = 0
      for (let i = 0; i < 60; i++) {
        const dateStr = format(subDays(today, i), 'yyyy-MM-dd')
        if (recordedDates.has(dateStr)) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      if (streak >= 7) {
        insights.push({
          id: 'streak',
          icon: '🔥',
          title: `${streak}일 연속 기록 중`,
          description:
            '꾸준한 기록이 더 정확한 예측을 만들어요. 정말 훌륭합니다!',
          type: 'positive',
        })
      }
    }

    // ── 5. Severity trend (worsening/improving) ──
    if (symptoms.length >= 10) {
      const sorted = [...symptoms].sort(
        (a, b) => a.date.localeCompare(b.date)
      )
      const recentHalf = sorted.slice(Math.floor(sorted.length / 2))
      const olderHalf = sorted.slice(0, Math.floor(sorted.length / 2))

      const recentAvg =
        recentHalf.reduce((sum, s) => sum + s.severity, 0) / recentHalf.length
      const olderAvg =
        olderHalf.reduce((sum, s) => sum + s.severity, 0) / olderHalf.length

      if (recentAvg < olderAvg - 0.5) {
        insights.push({
          id: 'severity-improving',
          icon: '📈',
          title: '증상이 완화되는 추세',
          description:
            '최근 기록된 증상의 심각도가 이전보다 낮아지고 있어요. 좋은 신호입니다!',
          type: 'positive',
        })
      } else if (recentAvg > olderAvg + 0.5) {
        insights.push({
          id: 'severity-worsening',
          icon: '⚠️',
          title: '증상 심각도 증가',
          description:
            '최근 증상의 심각도가 이전보다 높아지고 있어요. 지속되면 전문가 상담을 고려해보세요.',
          type: 'warning',
        })
      }
    }

    // ── 6. Data encouragement ──
    if (periods.length === 0) {
      insights.push({
        id: 'need-data',
        icon: '📝',
        title: '기록을 시작해보세요',
        description:
          '생리 시작일을 기록하면 주기 예측과 맞춤 분석을 받을 수 있어요.',
        type: 'info',
      })
    } else if (periods.length < 3) {
      insights.push({
        id: 'need-more',
        icon: '📊',
        title: `${3 - periods.length}회 더 기록하면 분석 시작`,
        description:
          '3회 이상 기록하면 주기 규칙성 분석과 더 정확한 예측이 가능합니다.',
        type: 'info',
      })
    }

    return insights.slice(0, 3)
  }, [periods, symptoms, prediction, cycleDay])
}
