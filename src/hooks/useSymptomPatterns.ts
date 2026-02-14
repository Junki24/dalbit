import { useMemo } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import type { Period, Symptom, SymptomType, CyclePhase, SymptomInsight } from '@/types'
import { getCyclePhaseInfo } from '@/lib/cycle'

/**
 * Bayesian phase-bucket symptom pattern analysis.
 *
 * Algorithm:
 *   For each (symptom, phase) combo, compute:
 *     p(W) = (k + 1) / (n + 2)   — Bayesian smoothed with Beta(1,1) prior
 *     p0   = baseline probability across all phases
 *     lift = p(W) / p0
 *
 *   Surface insight if: sampleDays >= 10, cycles >= 3, lift >= 1.5
 */
export function useSymptomPatterns(
  periods: Period[],
  symptoms: Symptom[],
  avgCycleLength: number
): SymptomInsight[] {
  return useMemo(() => {
    if (periods.length < 3 || symptoms.length < 10) return []

    // ── 1. Build cycle intervals from periods ──
    const sorted = [...periods].sort(
      (a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
    )

    // Each cycle = [start of period N, start of period N+1)
    const cycles: { start: Date; end: Date; length: number }[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = parseISO(sorted[i].start_date)
      const end = parseISO(sorted[i + 1].start_date)
      const length = differenceInDays(end, start)
      if (length > 0 && length < 60) {
        cycles.push({ start, end, length })
      }
    }

    if (cycles.length < 3) return []

    // ── 2. Assign each symptom to a cycle phase ──
    type BucketKey = `${SymptomType}::${CyclePhase}`
    const phaseDayCounts = new Map<CyclePhase, number>() // total days per phase
    const symptomPhaseCounts = new Map<BucketKey, number>() // symptom occurrences per phase
    const symptomTotalCounts = new Map<SymptomType, number>() // symptom total occurrences
    let totalDays = 0

    for (const cycle of cycles) {
      const cycleLen = cycle.length

      for (let day = 0; day < cycleLen; day++) {
        const cycleDay = day + 1 // 1-based
        const phaseInfo = getCyclePhaseInfo(cycleDay, cycleLen)
        const phase = phaseInfo.phase

        phaseDayCounts.set(phase, (phaseDayCounts.get(phase) ?? 0) + 1)
        totalDays++

        // Check if any symptom was recorded on this day
        const dateMs = parseISO(sorted[cycles.indexOf(cycle)].start_date).getTime() + day * 86400000
        const dateStr = new Date(dateMs).toISOString().slice(0, 10)

        const daySymptoms = symptoms.filter(s => s.date === dateStr)
        for (const s of daySymptoms) {
          const type = s.symptom_type as SymptomType
          const key: BucketKey = `${type}::${phase}`
          symptomPhaseCounts.set(key, (symptomPhaseCounts.get(key) ?? 0) + 1)
          symptomTotalCounts.set(type, (symptomTotalCounts.get(type) ?? 0) + 1)
        }
      }
    }

    if (totalDays < 10) return []

    // ── 3. Compute Bayesian probability and lift ──
    const insights: SymptomInsight[] = []
    const phases: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

    for (const [symptomType, totalOccurrences] of symptomTotalCounts.entries()) {
      // Baseline: p0 = (totalOccurrences + 1) / (totalDays + 2)
      const baseline = (totalOccurrences + 1) / (totalDays + 2)

      for (const phase of phases) {
        const key: BucketKey = `${symptomType}::${phase}`
        const k = symptomPhaseCounts.get(key) ?? 0
        const n = phaseDayCounts.get(phase) ?? 0

        if (n === 0) continue

        // Bayesian smoothed: p(W) = (k + 1) / (n + 2)
        const probability = (k + 1) / (n + 2)
        const lift = probability / baseline

        if (lift >= 1.5) {
          insights.push({
            symptomType,
            phase,
            probability,
            baseline,
            lift,
            sampleDays: totalDays,
            cycleCount: cycles.length,
          })
        }
      }
    }

    // Sort by lift descending
    insights.sort((a, b) => b.lift - a.lift)

    return insights
  }, [periods, symptoms, avgCycleLength])
}
