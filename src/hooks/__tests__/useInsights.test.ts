import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInsights } from '../useInsights'
import type { Period, Symptom, CyclePrediction } from '@/types'
import { addDays, format, subDays } from 'date-fns'

function makePeriod(startDate: string, endDate?: string | null): Period {
  return {
    id: crypto.randomUUID(),
    user_id: 'test-user',
    start_date: startDate,
    end_date: endDate ?? null,
    flow_intensity: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
}

function makeSymptom(
  date: string,
  type: string = 'cramps',
  severity: 1 | 2 | 3 | 4 | 5 = 3
): Symptom {
  return {
    id: crypto.randomUUID(),
    user_id: 'test-user',
    date,
    symptom_type: type as Symptom['symptom_type'],
    severity,
    notes: null,
    created_at: new Date().toISOString(),
  }
}

function makePrediction(overrides?: Partial<CyclePrediction>): CyclePrediction {
  const now = new Date()
  return {
    nextPeriodDate: addDays(now, 14),
    ovulationDate: addDays(now, 7),
    fertileWindowStart: addDays(now, 5),
    fertileWindowEnd: addDays(now, 8),
    confidence: 'medium',
    averageCycleLength: 28,
    ...overrides,
  }
}

describe('useInsights', () => {
  it('데이터 없을 때 기록 시작 인사이트 반환', () => {
    const { result } = renderHook(() =>
      useInsights([], [], null, null)
    )

    expect(result.current.length).toBeGreaterThan(0)
    const needData = result.current.find((i) => i.id === 'need-data')
    expect(needData).toBeDefined()
    expect(needData!.type).toBe('info')
  })

  it('period 1~2개: 추가 기록 필요 인사이트', () => {
    const periods = [makePeriod('2025-12-01')]
    const { result } = renderHook(() =>
      useInsights(periods, [], makePrediction(), 5)
    )

    const needMore = result.current.find((i) => i.id === 'need-more')
    expect(needMore).toBeDefined()
    expect(needMore!.title).toContain('2회')
  })

  it('규칙적 주기 감지 (3+ periods, 편차 <= 2)', () => {
    // 28일 간격 정확
    const periods = [
      makePeriod('2025-04-22'),
      makePeriod('2025-03-25'),
      makePeriod('2025-02-25'),
      makePeriod('2025-01-28'),
    ]
    const { result } = renderHook(() =>
      useInsights(periods, [], makePrediction(), 10)
    )

    const regular = result.current.find((i) => i.id === 'cycle-regular')
    expect(regular).toBeDefined()
    expect(regular!.type).toBe('positive')
  })

  it('불규칙 주기 감지 (편차 > 5)', () => {
    // 급변하는 간격: 20, 40, 25
    const periods = [
      makePeriod('2025-04-10'),
      makePeriod('2025-03-01'), // 40일
      makePeriod('2025-01-20'), // 40일
      makePeriod('2025-01-01'), // 19일
    ]
    const { result } = renderHook(() =>
      useInsights(periods, [], makePrediction(), 10)
    )

    const irregular = result.current.find((i) => i.id === 'cycle-irregular')
    expect(irregular).toBeDefined()
    expect(irregular!.type).toBe('warning')
  })

  it('생리 전 증상 패턴 감지', () => {
    const periods = [
      makePeriod('2025-03-01'),
      makePeriod('2025-02-01'),
      makePeriod('2025-01-01'),
    ]

    // 생리 2일 전에 두통이 반복적으로 나타남
    const symptoms = [
      makeSymptom('2025-02-27', 'headache'),
      makeSymptom('2025-01-30', 'headache'),
      makeSymptom('2024-12-30', 'headache'),
    ]

    const { result } = renderHook(() =>
      useInsights(periods, symptoms, makePrediction(), 10)
    )

    const pattern = result.current.find((i) => i.id === 'preperiod-pattern')
    expect(pattern).toBeDefined()
    expect(pattern!.description).toContain('두통')
  })

  it('생리기 팁 (cycleDay <= 5)', () => {
    const periods = [makePeriod('2025-01-01')]
    const { result } = renderHook(() =>
      useInsights(periods, [], makePrediction(), 3)
    )

    const tip = result.current.find((i) => i.id === 'phase-tip')
    expect(tip).toBeDefined()
    expect(tip!.icon).toBe('🫖')
  })

  it('활력기 팁 (난포기)', () => {
    const periods = [makePeriod('2025-01-01')]
    const pred = makePrediction({ averageCycleLength: 28 })
    const { result } = renderHook(() =>
      useInsights(periods, [], pred, 8)
    )

    const tip = result.current.find((i) => i.id === 'phase-tip')
    expect(tip).toBeDefined()
    expect(tip!.icon).toBe('💪')
  })

  it('셀프케어 팁 (황체기 후반)', () => {
    const periods = [makePeriod('2025-01-01')]
    const pred = makePrediction({ averageCycleLength: 28 })
    const { result } = renderHook(() =>
      useInsights(periods, [], pred, 25)
    )

    const tip = result.current.find((i) => i.id === 'phase-tip')
    expect(tip).toBeDefined()
    expect(tip!.icon).toBe('🧘')
  })

  it('연속 기록 스트릭 감지 (7일+)', () => {
    const today = new Date()
    const symptoms = Array.from({ length: 8 }, (_, i) =>
      makeSymptom(format(subDays(today, i), 'yyyy-MM-dd'), 'fatigue')
    )

    const periods = [makePeriod('2025-01-01')]
    const { result } = renderHook(() =>
      useInsights(periods, symptoms, makePrediction(), 10)
    )

    const streak = result.current.find((i) => i.id === 'streak')
    expect(streak).toBeDefined()
    expect(streak!.description).toContain('꾸준한')
  })

  it('증상 심각도 완화 추세 감지', () => {
    const symptoms = [
      // 과거: 높은 심각도
      ...Array.from({ length: 6 }, (_, i) =>
        makeSymptom(`2025-01-${String(i + 1).padStart(2, '0')}`, 'cramps', 5)
      ),
      // 최근: 낮은 심각도
      ...Array.from({ length: 6 }, (_, i) =>
        makeSymptom(`2025-02-${String(i + 1).padStart(2, '0')}`, 'cramps', 2)
      ),
    ]

    const periods = [makePeriod('2025-01-01'), makePeriod('2025-02-01'), makePeriod('2025-03-01')]
    const { result } = renderHook(() =>
      useInsights(periods, symptoms, makePrediction(), 10)
    )

    const improving = result.current.find((i) => i.id === 'severity-improving')
    expect(improving).toBeDefined()
    expect(improving!.type).toBe('positive')
  })

  it('증상 심각도 악화 추세 감지', () => {
    const symptoms = [
      // 과거: 낮은 심각도
      ...Array.from({ length: 6 }, (_, i) =>
        makeSymptom(`2025-01-${String(i + 1).padStart(2, '0')}`, 'cramps', 1)
      ),
      // 최근: 높은 심각도
      ...Array.from({ length: 6 }, (_, i) =>
        makeSymptom(`2025-02-${String(i + 1).padStart(2, '0')}`, 'cramps', 5)
      ),
    ]

    const periods = [makePeriod('2025-01-01'), makePeriod('2025-02-01'), makePeriod('2025-03-01')]
    const { result } = renderHook(() =>
      useInsights(periods, symptoms, makePrediction(), 10)
    )

    const worsening = result.current.find((i) => i.id === 'severity-worsening')
    expect(worsening).toBeDefined()
    expect(worsening!.type).toBe('warning')
  })

  it('최대 3개 인사이트만 반환', () => {
    const today = new Date()
    const periods = [
      makePeriod(format(subDays(today, 5), 'yyyy-MM-dd')),
      makePeriod(format(subDays(today, 33), 'yyyy-MM-dd')),
      makePeriod(format(subDays(today, 61), 'yyyy-MM-dd')),
      makePeriod(format(subDays(today, 89), 'yyyy-MM-dd')),
    ]

    const symptoms = Array.from({ length: 15 }, (_, i) =>
      makeSymptom(format(subDays(today, i), 'yyyy-MM-dd'), 'fatigue', 3)
    )

    const pred = makePrediction({ averageCycleLength: 28 })
    const { result } = renderHook(() =>
      useInsights(periods, symptoms, pred, 5)
    )

    expect(result.current.length).toBeLessThanOrEqual(3)
  })
})
