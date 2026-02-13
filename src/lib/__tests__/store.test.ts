import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../store'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAppStore.setState({
      selectedDate: new Date(),
      showSymptomModal: false,
      showPeriodModal: false,
      installPromptEvent: null,
      showInstallBanner: false,
    })
  })

  it('초기 상태가 올바름', () => {
    const state = useAppStore.getState()
    expect(state.showSymptomModal).toBe(false)
    expect(state.showPeriodModal).toBe(false)
    expect(state.installPromptEvent).toBeNull()
    expect(state.showInstallBanner).toBe(false)
    expect(state.selectedDate).toBeInstanceOf(Date)
  })

  it('날짜 선택', () => {
    const testDate = new Date('2025-06-15')
    useAppStore.getState().setSelectedDate(testDate)
    expect(useAppStore.getState().selectedDate).toEqual(testDate)
  })

  it('증상 모달 토글', () => {
    useAppStore.getState().setShowSymptomModal(true)
    expect(useAppStore.getState().showSymptomModal).toBe(true)

    useAppStore.getState().setShowSymptomModal(false)
    expect(useAppStore.getState().showSymptomModal).toBe(false)
  })

  it('생리 모달 토글', () => {
    useAppStore.getState().setShowPeriodModal(true)
    expect(useAppStore.getState().showPeriodModal).toBe(true)
  })

  it('설치 배너 토글', () => {
    useAppStore.getState().setShowInstallBanner(true)
    expect(useAppStore.getState().showInstallBanner).toBe(true)
  })
})
