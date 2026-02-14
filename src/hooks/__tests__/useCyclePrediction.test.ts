import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCyclePrediction } from '../useCyclePrediction'
import type { Period } from '@/types'

function makePeriod(startDate: string, endDate?: string | null): Period {
  return {
    id: crypto.randomUUID(),
    user_id: 'test-user',
    start_date: startDate,
    end_date: endDate ?? null,
    flow_intensity: null,
    flow_intensities: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
}

describe('useCyclePrediction', () => {
  it('periods 빈 배열이면 모든 값 null', () => {
    const { result } = renderHook(() => useCyclePrediction([]))
    expect(result.current.prediction).toBeNull()
    expect(result.current.cycleDay).toBeNull()
    expect(result.current.phaseInfo).toBeNull()
    expect(result.current.lastPeriod).toBeNull()
  })

  it('period 1개면 prediction 존재', () => {
    const periods = [makePeriod('2025-01-01')]
    const { result } = renderHook(() => useCyclePrediction(periods))

    expect(result.current.prediction).not.toBeNull()
    expect(result.current.lastPeriod).not.toBeNull()
    expect(result.current.lastPeriod!.start_date).toBe('2025-01-01')
    expect(result.current.cycleDay).toBeGreaterThanOrEqual(1)
    expect(result.current.phaseInfo).not.toBeNull()
  })

  it('정렬 안된 periods에서 가장 최근이 lastPeriod', () => {
    const periods = [
      makePeriod('2025-01-01'),
      makePeriod('2025-03-01'),
      makePeriod('2025-02-01'),
    ]
    const { result } = renderHook(() => useCyclePrediction(periods))

    expect(result.current.lastPeriod!.start_date).toBe('2025-03-01')
  })

  it('phaseInfo에 한국어 phaseKo 존재', () => {
    const periods = [makePeriod('2025-01-01')]
    const { result } = renderHook(() => useCyclePrediction(periods))

    expect(result.current.phaseInfo!.phaseKo).toBeTruthy()
    expect(result.current.phaseInfo!.color).toBeTruthy()
  })

  it('periods 변경 시 결과 업데이트', () => {
    const periods1 = [makePeriod('2025-01-01')]
    const { result, rerender } = renderHook(
      ({ periods }) => useCyclePrediction(periods),
      { initialProps: { periods: periods1 } }
    )

    expect(result.current.lastPeriod!.start_date).toBe('2025-01-01')

    const periods2 = [makePeriod('2025-06-01'), makePeriod('2025-01-01')]
    rerender({ periods: periods2 })

    expect(result.current.lastPeriod!.start_date).toBe('2025-06-01')
  })

  it('prediction의 averageCycleLength 계산', () => {
    const periods = [
      makePeriod('2025-02-28'),
      makePeriod('2025-01-31'), // 28일 간격
    ]
    const { result } = renderHook(() => useCyclePrediction(periods))

    expect(result.current.prediction!.averageCycleLength).toBe(28)
  })
})
