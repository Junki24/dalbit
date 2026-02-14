import { describe, it, expect } from 'vitest'
import { format, addDays, subDays } from 'date-fns'
import {
  calculateCyclePrediction,
  getCycleDay,
  getCyclePhaseInfo,
  getFlowForDate,
  isDateInPeriod,
  isDateInPredictedPeriod,
  isDateInFertileWindow,
  isOvulationDay,
} from '../cycle'
import type { Period, CyclePrediction } from '@/types'

// ============================================
// Test Helpers
// ============================================

function makePeriod(
  startDate: string,
  endDate?: string | null,
  flowIntensity?: Period['flow_intensity']
): Period {
  return {
    id: crypto.randomUUID(),
    user_id: 'test-user',
    start_date: startDate,
    end_date: endDate ?? null,
    flow_intensity: flowIntensity ?? null,
    flow_intensities: flowIntensity ? { [startDate]: flowIntensity } : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
}

function dateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ============================================
// calculateCyclePrediction
// ============================================

describe('calculateCyclePrediction', () => {
  it('빈 배열이면 null 반환', () => {
    expect(calculateCyclePrediction([])).toBeNull()
  })

  it('기록 1개면 기본 28일 주기로 예측', () => {
    const periods = [makePeriod('2025-01-01')]
    const result = calculateCyclePrediction(periods)

    expect(result).not.toBeNull()
    expect(result!.averageCycleLength).toBe(28)
    expect(dateStr(result!.nextPeriodDate)).toBe('2025-01-29')
    expect(result!.confidence).toBe('low')
  })

  it('기록 2개면 실제 주기 간격을 사용', () => {
    const periods = [
      makePeriod('2025-02-01'), // 31일 후
      makePeriod('2025-01-01'),
    ]
    const result = calculateCyclePrediction(periods)

    expect(result).not.toBeNull()
    expect(result!.averageCycleLength).toBe(31)
    expect(dateStr(result!.nextPeriodDate)).toBe('2025-03-04')
    expect(result!.confidence).toBe('low')
  })

  it('기록 3개면 평균 주기 계산 + medium confidence', () => {
    const periods = [
      makePeriod('2025-03-01'), // 28일 후
      makePeriod('2025-02-01'), // 31일 후
      makePeriod('2025-01-01'),
    ]
    const result = calculateCyclePrediction(periods)

    expect(result).not.toBeNull()
    // (28 + 31) / 2 = 29.5 → 30 (반올림)
    expect(result!.averageCycleLength).toBe(30)
    expect(result!.confidence).toBe('medium')
  })

  it('기록 6개 이상이면 high confidence', () => {
    const periods = [
      makePeriod('2025-06-01'),
      makePeriod('2025-05-04'),
      makePeriod('2025-04-06'),
      makePeriod('2025-03-09'),
      makePeriod('2025-02-09'),
      makePeriod('2025-01-12'),
    ]
    const result = calculateCyclePrediction(periods)

    expect(result).not.toBeNull()
    expect(result!.confidence).toBe('high')
  })

  it('최대 3개 간격만 사용 (최근 3주기)', () => {
    // 5개 기록이 있어도 최근 3개 간격만 평균
    const periods = [
      makePeriod('2025-05-01'), // 30일
      makePeriod('2025-04-01'), // 28일
      makePeriod('2025-03-04'), // 32일
      makePeriod('2025-01-31'), // 31일 (사용 안됨)
      makePeriod('2025-01-01'), // (사용 안됨)
    ]
    const result = calculateCyclePrediction(periods)

    // (30 + 28 + 32) / 3 = 30
    expect(result!.averageCycleLength).toBe(30)
  })

  it('비정상적인 간격 (60일 이상)은 무시', () => {
    const periods = [
      makePeriod('2025-06-01'),
      makePeriod('2025-01-01'), // 151일 간격 → 무시
    ]
    const result = calculateCyclePrediction(periods)

    // 유효한 간격이 없으므로 기본 28일
    expect(result!.averageCycleLength).toBe(28)
  })

  it('정렬 안된 배열도 올바르게 처리', () => {
    const periods = [
      makePeriod('2025-01-01'),
      makePeriod('2025-03-01'),
      makePeriod('2025-02-01'),
    ]
    const result = calculateCyclePrediction(periods)

    expect(result).not.toBeNull()
    // 가장 최근 기록이 3/1
    expect(dateStr(result!.nextPeriodDate)).toBe(
      dateStr(addDays(new Date('2025-03-01'), result!.averageCycleLength))
    )
  })

  it('배란일은 주기 길이 - 14일', () => {
    const periods = [
      makePeriod('2025-02-01'),
      makePeriod('2025-01-01'), // 31일 주기
    ]
    const result = calculateCyclePrediction(periods)

    // 배란일 = 마지막 생리 시작일 + (31 - 14) = 2025-02-01 + 17 = 2025-02-18
    expect(dateStr(result!.ovulationDate)).toBe('2025-02-18')
  })

  it('가임기는 배란일 -5 ~ +1', () => {
    const periods = [
      makePeriod('2025-02-01'),
      makePeriod('2025-01-01'),
    ]
    const result = calculateCyclePrediction(periods)

    const ovDay = result!.ovulationDate
    expect(dateStr(result!.fertileWindowStart)).toBe(dateStr(subDays(ovDay, 5)))
    expect(dateStr(result!.fertileWindowEnd)).toBe(dateStr(addDays(ovDay, 1)))
  })
})

// ============================================
// getCycleDay
// ============================================

describe('getCycleDay', () => {
  it('생리 시작일은 1일째', () => {
    const today = new Date('2025-03-01')
    expect(getCycleDay(new Date('2025-03-01'), today)).toBe(1)
  })

  it('생리 시작 다음날은 2일째', () => {
    const today = new Date('2025-03-02')
    expect(getCycleDay(new Date('2025-03-01'), today)).toBe(2)
  })

  it('28일째 계산', () => {
    const start = new Date('2025-01-01')
    const today = new Date('2025-01-28')
    expect(getCycleDay(start, today)).toBe(28)
  })

  it('음수가 되면 최소 1 반환', () => {
    const start = new Date('2025-03-10')
    const today = new Date('2025-03-01')
    expect(getCycleDay(start, today)).toBe(1)
  })
})

// ============================================
// getCyclePhaseInfo
// ============================================

describe('getCyclePhaseInfo', () => {
  it('1~5일 = 생리기', () => {
    expect(getCyclePhaseInfo(1).phase).toBe('menstrual')
    expect(getCyclePhaseInfo(3).phase).toBe('menstrual')
    expect(getCyclePhaseInfo(5).phase).toBe('menstrual')
  })

  it('6일~배란기 전 = 난포기', () => {
    // 28일 주기 기준 배란일 = 14, 가임기 시작 = 9
    expect(getCyclePhaseInfo(6, 28).phase).toBe('follicular')
    expect(getCyclePhaseInfo(8, 28).phase).toBe('follicular')
  })

  it('배란기 근처 = 배란기', () => {
    // 28일 주기: 배란일 = 14, 배란기 = 9~15
    expect(getCyclePhaseInfo(14, 28).phase).toBe('ovulation')
    expect(getCyclePhaseInfo(15, 28).phase).toBe('ovulation')
  })

  it('배란 후 ~ 생리 전 = 황체기', () => {
    expect(getCyclePhaseInfo(16, 28).phase).toBe('luteal')
    expect(getCyclePhaseInfo(25, 28).phase).toBe('luteal')
    expect(getCyclePhaseInfo(28, 28).phase).toBe('luteal')
  })

  it('한국어 라벨 존재', () => {
    const info = getCyclePhaseInfo(1)
    expect(info.phaseKo).toBe('생리기')
    expect(info.description.length).toBeGreaterThan(0)
    expect(info.partnerTip.length).toBeGreaterThan(0)
  })

  it('색상값 존재', () => {
    const phases = [1, 7, 14, 20]
    for (const day of phases) {
      const info = getCyclePhaseInfo(day)
      expect(info.color).toBeTruthy()
    }
  })

  it('30일 주기도 올바르게 처리', () => {
    // 30일 주기: 배란일 = 16
    expect(getCyclePhaseInfo(6, 30).phase).toBe('follicular')
    expect(getCyclePhaseInfo(16, 30).phase).toBe('ovulation')
    expect(getCyclePhaseInfo(18, 30).phase).toBe('luteal')
  })
})

// ============================================
// getFlowForDate
// ============================================

describe('getFlowForDate', () => {
  it('null period면 null 반환', () => {
    expect(getFlowForDate(null, '2025-03-01')).toBeNull()
  })

  it('per-day map에 해당 날짜가 있으면 해당 값 반환', () => {
    const period = makePeriod('2025-03-01', '2025-03-05', 'medium')
    period.flow_intensities = {
      '2025-03-01': 'light',
      '2025-03-02': 'heavy',
    }
    expect(getFlowForDate(period, '2025-03-01')).toBe('light')
    expect(getFlowForDate(period, '2025-03-02')).toBe('heavy')
  })

  it('per-day map에 없으면 period-level flow_intensity 반환', () => {
    const period = makePeriod('2025-03-01', '2025-03-05', 'medium')
    period.flow_intensities = { '2025-03-01': 'light' }
    expect(getFlowForDate(period, '2025-03-03')).toBe('medium')
  })

  it('flow_intensities가 null이면 flow_intensity 반환', () => {
    const period = makePeriod('2025-03-01', '2025-03-05', 'heavy')
    period.flow_intensities = null
    expect(getFlowForDate(period, '2025-03-01')).toBe('heavy')
  })

  it('둘 다 없으면 null 반환', () => {
    const period = makePeriod('2025-03-01', '2025-03-05')
    period.flow_intensities = null
    expect(getFlowForDate(period, '2025-03-01')).toBeNull()
  })
})

// ============================================
// isDateInPeriod
// ============================================

describe('isDateInPeriod', () => {
  const periods = [
    makePeriod('2025-03-01', '2025-03-05', 'medium'),
    makePeriod('2025-02-01', '2025-02-04', 'light'),
  ]

  it('생리 기간 내 날짜면 해당 Period 반환', () => {
    const result = isDateInPeriod('2025-03-03', periods)
    expect(result).not.toBeNull()
    expect(result!.start_date).toBe('2025-03-01')
  })

  it('생리 시작일도 포함', () => {
    expect(isDateInPeriod('2025-03-01', periods)).not.toBeNull()
  })

  it('생리 종료일도 포함', () => {
    expect(isDateInPeriod('2025-03-05', periods)).not.toBeNull()
  })

  it('생리 기간 밖이면 null 반환', () => {
    expect(isDateInPeriod('2025-03-10', periods)).toBeNull()
  })

  it('end_date가 없으면 시작일 + 4일 (5일 기본)', () => {
    const periodsNoEnd = [makePeriod('2025-04-01')]
    expect(isDateInPeriod('2025-04-05', periodsNoEnd)).not.toBeNull()
    expect(isDateInPeriod('2025-04-06', periodsNoEnd)).toBeNull()
  })
})

// ============================================
// isDateInPredictedPeriod
// ============================================

describe('isDateInPredictedPeriod', () => {
  const prediction: CyclePrediction = {
    nextPeriodDate: new Date('2025-04-01'),
    ovulationDate: new Date('2025-03-18'),
    fertileWindowStart: new Date('2025-03-13'),
    fertileWindowEnd: new Date('2025-03-19'),
    confidence: 'medium',
    averageCycleLength: 28,
  }

  it('예측 생리 기간 내면 true', () => {
    expect(isDateInPredictedPeriod(new Date('2025-04-01'), prediction)).toBe(true)
    expect(isDateInPredictedPeriod(new Date('2025-04-03'), prediction)).toBe(true)
    expect(isDateInPredictedPeriod(new Date('2025-04-05'), prediction)).toBe(true)
  })

  it('예측 기간 밖이면 false', () => {
    expect(isDateInPredictedPeriod(new Date('2025-04-10'), prediction)).toBe(false)
  })

  it('prediction이 null이면 false', () => {
    expect(isDateInPredictedPeriod(new Date('2025-04-01'), null)).toBe(false)
  })
})

// ============================================
// isDateInFertileWindow
// ============================================

describe('isDateInFertileWindow', () => {
  const prediction: CyclePrediction = {
    nextPeriodDate: new Date('2025-04-01'),
    ovulationDate: new Date('2025-03-18'),
    fertileWindowStart: new Date('2025-03-13'),
    fertileWindowEnd: new Date('2025-03-19'),
    confidence: 'medium',
    averageCycleLength: 28,
  }

  it('가임기 내면 true', () => {
    expect(isDateInFertileWindow(new Date('2025-03-15'), prediction)).toBe(true)
  })

  it('가임기 시작일 포함', () => {
    expect(isDateInFertileWindow(new Date('2025-03-13'), prediction)).toBe(true)
  })

  it('가임기 종료일 포함', () => {
    expect(isDateInFertileWindow(new Date('2025-03-19'), prediction)).toBe(true)
  })

  it('가임기 밖이면 false', () => {
    expect(isDateInFertileWindow(new Date('2025-03-10'), prediction)).toBe(false)
  })

  it('prediction이 null이면 false', () => {
    expect(isDateInFertileWindow(new Date('2025-03-15'), null)).toBe(false)
  })
})

// ============================================
// isOvulationDay
// ============================================

describe('isOvulationDay', () => {
  const prediction: CyclePrediction = {
    nextPeriodDate: new Date('2025-04-01'),
    ovulationDate: new Date('2025-03-18'),
    fertileWindowStart: new Date('2025-03-13'),
    fertileWindowEnd: new Date('2025-03-19'),
    confidence: 'medium',
    averageCycleLength: 28,
  }

  it('배란일이면 true', () => {
    expect(isOvulationDay(new Date('2025-03-18'), prediction)).toBe(true)
  })

  it('배란일이 아니면 false', () => {
    expect(isOvulationDay(new Date('2025-03-17'), prediction)).toBe(false)
    expect(isOvulationDay(new Date('2025-03-19'), prediction)).toBe(false)
  })

  it('prediction이 null이면 false', () => {
    expect(isOvulationDay(new Date('2025-03-18'), null)).toBe(false)
  })
})
