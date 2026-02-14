import {
  addDays,
  differenceInDays,
  parseISO,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import type { Period, CyclePrediction, CyclePhaseInfo, FlowIntensity } from '@/types'

/**
 * Calculate cycle prediction based on period history
 * Uses average of last 3 cycles (calendar method)
 */
export function calculateCyclePrediction(
  periods: Period[]
): CyclePrediction | null {
  if (periods.length === 0) return null

  // Sort by start_date descending (most recent first)
  const sorted = [...periods].sort(
    (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
  )

  const lastPeriod = parseISO(sorted[0].start_date)

  // Calculate intervals between periods
  const intervals: number[] = []
  for (let i = 0; i < sorted.length - 1 && i < 3; i++) {
    const current = parseISO(sorted[i].start_date)
    const previous = parseISO(sorted[i + 1].start_date)
    const diff = differenceInDays(current, previous)
    if (diff > 0 && diff < 60) { // sanity check
      intervals.push(diff)
    }
  }

  // Calculate average cycle length
  const avgCycleLength =
    intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 28

  // Confidence based on data points
  const totalPeriods = sorted.length
  let confidence: CyclePrediction['confidence'] = 'low'
  if (totalPeriods >= 6) confidence = 'high'
  else if (totalPeriods >= 3) confidence = 'medium'

  // Calculate predictions
  const nextPeriodDate = addDays(lastPeriod, avgCycleLength)
  const ovulationDay = avgCycleLength - 14
  const ovulationDate = addDays(lastPeriod, ovulationDay)
  const fertileWindowStart = addDays(lastPeriod, ovulationDay - 5)
  const fertileWindowEnd = addDays(lastPeriod, ovulationDay + 1)

  return {
    nextPeriodDate,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    confidence,
    averageCycleLength: avgCycleLength,
  }
}

/**
 * Get current cycle day (1-based)
 */
export function getCycleDay(lastPeriodStart: Date, today: Date = new Date()): number {
  const diff = differenceInDays(startOfDay(today), startOfDay(lastPeriodStart))
  return Math.max(1, diff + 1)
}

/**
 * Get cycle phase info with Korean labels and partner tips
 */
export function getCyclePhaseInfo(
  cycleDay: number,
  avgCycleLength: number = 28
): CyclePhaseInfo {
  const ovulationDay = avgCycleLength - 14

  if (cycleDay <= 5) {
    return {
      phase: 'menstrual',
      phaseKo: '생리기',
      description: '생리 중이에요',
      partnerTip: '따뜻한 차와 편안한 휴식이 도움이 됩니다. 복통이 있을 수 있으니 이해해 주세요.',
      color: 'var(--color-period)',
    }
  }

  if (cycleDay <= ovulationDay - 5) {
    return {
      phase: 'follicular',
      phaseKo: '난포기',
      description: '에너지가 올라가는 시기',
      partnerTip: '에너지와 기분이 좋아지는 시기예요. 함께 활동적인 데이트를 즐겨보세요.',
      color: 'var(--color-success)',
    }
  }

  if (cycleDay <= ovulationDay + 1) {
    return {
      phase: 'ovulation',
      phaseKo: '배란기',
      description: '배란 시기',
      partnerTip: '가임기입니다. 임신 계획이 있다면 좋은 시기예요.',
      color: 'var(--color-ovulation)',
    }
  }

  return {
    phase: 'luteal',
    phaseKo: '황체기',
    description: '생리 전 준비 시기',
    partnerTip: 'PMS 증상이 나타날 수 있어요. 기분 변화에 인내심을 가져주세요. 단 음식이 당길 수 있습니다.',
    color: 'var(--color-primary)',
  }
}

/**
 * Get flow intensity for a specific date from a period record.
 * Checks per-day map first, falls back to period-level default.
 */
export function getFlowForDate(
  period: Period | null,
  dateStr: string
): FlowIntensity | null {
  if (!period) return null
  return period.flow_intensities?.[dateStr] ?? period.flow_intensity ?? null
}

/**
 * Check if a date falls within a period
 */
export function isDateInPeriod(dateStr: string, periods: Period[]): Period | null {
  const date = startOfDay(parseISO(dateStr))

  for (const period of periods) {
    const start = startOfDay(parseISO(period.start_date))
    const end = period.end_date
      ? startOfDay(parseISO(period.end_date))
      : addDays(start, 4) // default 5 days if no end date

    if (isWithinInterval(date, { start, end })) {
      return period
    }
  }
  return null
}

/**
 * Check if a date is in the predicted period window
 */
export function isDateInPredictedPeriod(
  date: Date,
  prediction: CyclePrediction | null,
  avgPeriodLength: number = 5
): boolean {
  if (!prediction) return false
  const start = startOfDay(prediction.nextPeriodDate)
  const end = addDays(start, avgPeriodLength - 1)
  return isWithinInterval(startOfDay(date), { start, end })
}

/**
 * Check if a date is in the fertile window
 */
export function isDateInFertileWindow(
  date: Date,
  prediction: CyclePrediction | null
): boolean {
  if (!prediction) return false
  return isWithinInterval(startOfDay(date), {
    start: startOfDay(prediction.fertileWindowStart),
    end: startOfDay(prediction.fertileWindowEnd),
  })
}

/**
 * Check if a date is ovulation day
 */
export function isOvulationDay(
  date: Date,
  prediction: CyclePrediction | null
): boolean {
  if (!prediction) return false
  return (
    startOfDay(date).getTime() === startOfDay(prediction.ovulationDate).getTime()
  )
}
