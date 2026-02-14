import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHaptic } from '../useHaptic'

describe('useHaptic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('navigator.vibrate가 있으면 호출', () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useHaptic())
    act(() => {
      result.current.vibrate('light')
    })

    expect(vibrateMock).toHaveBeenCalledWith(10)
  })

  it('medium 패턴', () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useHaptic())
    act(() => {
      result.current.vibrate('medium')
    })

    expect(vibrateMock).toHaveBeenCalledWith(25)
  })

  it('success 패턴 (배열)', () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useHaptic())
    act(() => {
      result.current.vibrate('success')
    })

    expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10])
  })

  it('navigator.vibrate가 없으면 에러 없이 무시', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useHaptic())
    expect(() => {
      act(() => {
        result.current.vibrate('light')
      })
    }).not.toThrow()
  })
})
