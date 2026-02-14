import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipe } from '../useSwipe'

function createTouchEvent(clientX: number, clientY: number) {
  return {
    touches: [{ clientX, clientY }],
    changedTouches: [{ clientX, clientY }],
  } as unknown as React.TouchEvent
}

describe('useSwipe', () => {
  it('왼쪽 스와이프 감지', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    )

    act(() => {
      result.current.onTouchStart(createTouchEvent(200, 100))
      result.current.onTouchEnd(createTouchEvent(100, 100)) // -100 horizontal
    })

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('오른쪽 스와이프 감지', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    )

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 100))
      result.current.onTouchEnd(createTouchEvent(200, 100)) // +100 horizontal
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('threshold 미만이면 스와이프 무시', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    )

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 100))
      result.current.onTouchEnd(createTouchEvent(130, 100)) // 30 < 50
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('수직 이동이 수평보다 크면 스와이프 무시', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    )

    act(() => {
      result.current.onTouchStart(createTouchEvent(100, 100))
      result.current.onTouchEnd(createTouchEvent(160, 300)) // vertical dominant
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('커스텀 threshold 작동', () => {
    const onSwipeLeft = vi.fn()

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, threshold: 100 })
    )

    // 60px — below custom 100px threshold
    act(() => {
      result.current.onTouchStart(createTouchEvent(200, 100))
      result.current.onTouchEnd(createTouchEvent(140, 100))
    })
    expect(onSwipeLeft).not.toHaveBeenCalled()

    // 110px — above threshold
    act(() => {
      result.current.onTouchStart(createTouchEvent(200, 100))
      result.current.onTouchEnd(createTouchEvent(90, 100))
    })
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })
})
