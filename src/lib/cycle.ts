import {
  addDays,
  differenceInDays,
  parseISO,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import type { Period, CyclePrediction, FutureCycle, CyclePhaseInfo, FlowIntensity } from '@/types'

/**
 * Calculate cycle prediction based on period history
 * Uses average of last 3 cycles (calendar method)
 */
export function calculateCyclePrediction(
  periods: Period[],
  predictionMonths: number = 3,
  avgPeriodLength: number = 5,
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

  // Calculate first prediction (next cycle)
  const nextPeriodDate = addDays(lastPeriod, avgCycleLength)
  const ovulationDay = avgCycleLength - 14
  const ovulationDate = addDays(lastPeriod, ovulationDay)
  const fertileWindowStart = addDays(lastPeriod, ovulationDay - 5)
  const fertileWindowEnd = addDays(lastPeriod, ovulationDay + 1)

  // Generate N future cycles (predictionMonths cycles ahead)
  // Each cycle: periodStart, and ovulation = periodStart + (avgCycleLength - 14)
  // (ovulation occurs ~14 days before the NEXT period)
  const clampedMonths = Math.max(1, Math.min(5, predictionMonths))
  const futureCycles: FutureCycle[] = []
  for (let i = 0; i < clampedMonths; i++) {
    const periodStart = addDays(lastPeriod, (i + 1) * avgCycleLength)
    const periodEnd = addDays(periodStart, avgPeriodLength - 1)
    const futureOvulation = addDays(periodStart, avgCycleLength - 14)
    const futureFertileStart = addDays(futureOvulation, -5)
    const futureFertileEnd = addDays(futureOvulation, 1)

    futureCycles.push({
      periodStart,
      periodEnd,
      ovulationDate: futureOvulation,
      fertileWindowStart: futureFertileStart,
      fertileWindowEnd: futureFertileEnd,
    })
  }

  return {
    nextPeriodDate,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    confidence,
    averageCycleLength: avgCycleLength,
    futureCycles,
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
 * Check if a date is in the predicted period window (any future cycle)
 */
export function isDateInPredictedPeriod(
  date: Date,
  prediction: CyclePrediction | null,
  avgPeriodLength: number = 5
): boolean {
  if (!prediction) return false
  const d = startOfDay(date)

  // Check all future cycles
  for (const cycle of prediction.futureCycles ?? []) {
    const start = startOfDay(cycle.periodStart)
    const end = startOfDay(cycle.periodEnd)
    if (isWithinInterval(d, { start, end })) return true
  }

  // Fallback: check nextPeriodDate (first cycle, backward compat)
  const start = startOfDay(prediction.nextPeriodDate)
  const end = addDays(start, avgPeriodLength - 1)
  return isWithinInterval(d, { start, end })
}

/**
 * Check if a date is in the fertile window (any future cycle)
 */
export function isDateInFertileWindow(
  date: Date,
  prediction: CyclePrediction | null
): boolean {
  if (!prediction) return false
  const d = startOfDay(date)

  // Check all future cycles
  for (const cycle of prediction.futureCycles ?? []) {
    if (isWithinInterval(d, {
      start: startOfDay(cycle.fertileWindowStart),
      end: startOfDay(cycle.fertileWindowEnd),
    })) return true
  }

  // Fallback: check current cycle's fertile window
  return isWithinInterval(d, {
    start: startOfDay(prediction.fertileWindowStart),
    end: startOfDay(prediction.fertileWindowEnd),
  })
}

/**
 * Check if a date is ovulation day (any future cycle)
 */
export function isOvulationDay(
  date: Date,
  prediction: CyclePrediction | null
): boolean {
  if (!prediction) return false
  const d = startOfDay(date).getTime()

  // Check all future cycles
  for (const cycle of prediction.futureCycles ?? []) {
    if (d === startOfDay(cycle.ovulationDate).getTime()) return true
  }

  // Fallback: check current cycle's ovulation
  return d === startOfDay(prediction.ovulationDate).getTime()
}
