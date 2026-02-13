import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { calculateCyclePrediction, getCycleDay, getCyclePhaseInfo } from '@/lib/cycle'
import type { Period, CyclePrediction, CyclePhaseInfo } from '@/types'

interface CyclePredictionResult {
  prediction: CyclePrediction | null
  cycleDay: number | null
  phaseInfo: CyclePhaseInfo | null
  lastPeriod: Period | null
}

export function useCyclePrediction(periods: Period[]): CyclePredictionResult {
  return useMemo(() => {
    if (periods.length === 0) {
      return { prediction: null, cycleDay: null, phaseInfo: null, lastPeriod: null }
    }

    const sorted = [...periods].sort(
      (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
    )

    const lastPeriod = sorted[0]
    const prediction = calculateCyclePrediction(periods)
    const avgCycleLength = prediction?.averageCycleLength ?? 28

    const lastPeriodDate = parseISO(lastPeriod.start_date)
    const cycleDay = getCycleDay(lastPeriodDate)
    const phaseInfo = getCyclePhaseInfo(cycleDay, avgCycleLength)

    return { prediction, cycleDay, phaseInfo, lastPeriod }
  }, [periods])
}
