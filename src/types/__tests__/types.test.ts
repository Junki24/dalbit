import { describe, it, expect } from 'vitest'
import {
  SYMPTOM_LABELS,
  SYMPTOM_ICONS,
  FLOW_LABELS,
  FLOW_COLORS,
} from '../index'
import type { SymptomType, FlowIntensity } from '../index'

describe('SYMPTOM_LABELS', () => {
  it('모든 증상 타입에 한국어 라벨이 있어야 함', () => {
    const symptomTypes: SymptomType[] = [
      'cramps', 'headache', 'backache', 'bloating',
      'fatigue', 'nausea', 'breast_tenderness',
      'mood_happy', 'mood_sad', 'mood_irritable', 'mood_anxious', 'mood_calm',
      'acne', 'insomnia', 'cravings',
    ]

    for (const type of symptomTypes) {
      expect(SYMPTOM_LABELS[type]).toBeDefined()
      expect(SYMPTOM_LABELS[type].length).toBeGreaterThan(0)
    }
  })

  it('라벨 값은 모두 한국어', () => {
    for (const label of Object.values(SYMPTOM_LABELS)) {
      // Korean characters are in Unicode range \uAC00-\uD7A3
      // But labels might have / or spaces
      expect(label).toMatch(/[가-힣]/)
    }
  })
})

describe('SYMPTOM_ICONS', () => {
  it('모든 증상 타입에 이모지 아이콘이 있어야 함', () => {
    const keys = Object.keys(SYMPTOM_LABELS)
    for (const key of keys) {
      expect(SYMPTOM_ICONS[key as SymptomType]).toBeDefined()
      expect(SYMPTOM_ICONS[key as SymptomType].length).toBeGreaterThan(0)
    }
  })

  it('SYMPTOM_LABELS와 SYMPTOM_ICONS의 키가 동일해야 함', () => {
    const labelKeys = Object.keys(SYMPTOM_LABELS).sort()
    const iconKeys = Object.keys(SYMPTOM_ICONS).sort()
    expect(labelKeys).toEqual(iconKeys)
  })
})

describe('FLOW_LABELS', () => {
  it('모든 출혈량 타입에 한국어 라벨이 있어야 함', () => {
    const flowTypes: FlowIntensity[] = ['spotting', 'light', 'medium', 'heavy']
    for (const type of flowTypes) {
      expect(FLOW_LABELS[type]).toBeDefined()
      expect(FLOW_LABELS[type].length).toBeGreaterThan(0)
    }
  })
})

describe('FLOW_COLORS', () => {
  it('모든 출혈량 타입에 색상값이 있어야 함', () => {
    const flowTypes: FlowIntensity[] = ['spotting', 'light', 'medium', 'heavy']
    for (const type of flowTypes) {
      expect(FLOW_COLORS[type]).toBeDefined()
      expect(FLOW_COLORS[type]).toMatch(/^#/)
    }
  })

  it('FLOW_LABELS와 FLOW_COLORS의 키가 동일해야 함', () => {
    const labelKeys = Object.keys(FLOW_LABELS).sort()
    const colorKeys = Object.keys(FLOW_COLORS).sort()
    expect(labelKeys).toEqual(colorKeys)
  })
})
