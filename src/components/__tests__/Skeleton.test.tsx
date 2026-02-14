import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonCircle, HomePageSkeleton, CalendarPageSkeleton, StatsPageSkeleton } from '../Skeleton'

describe('Skeleton', () => {
  it('기본 스켈레톤 렌더링', () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('.skeleton')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ height: '16px' })
  })

  it('커스텀 크기 적용', () => {
    const { container } = render(<Skeleton width="200px" height="40px" radius="8px" />)
    const el = container.querySelector('.skeleton')
    expect(el).toHaveStyle({ width: '200px', height: '40px', borderRadius: '8px' })
  })

  it('커스텀 className 적용', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    const el = container.querySelector('.skeleton')
    expect(el?.classList.contains('custom-class')).toBe(true)
  })
})

describe('SkeletonCircle', () => {
  it('기본 원형 스켈레톤 렌더링 (48px)', () => {
    const { container } = render(<SkeletonCircle />)
    const el = container.querySelector('.skeleton--circle')
    expect(el).toBeInTheDocument()
    expect(el).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('커스텀 크기 적용', () => {
    const { container } = render(<SkeletonCircle size="80px" />)
    const el = container.querySelector('.skeleton--circle')
    expect(el).toHaveStyle({ width: '80px', height: '80px' })
  })
})

describe('HomePageSkeleton', () => {
  it('렌더링 성공', () => {
    const { container } = render(<HomePageSkeleton />)
    expect(container.querySelector('.skeleton-page')).toBeInTheDocument()
    // 원형 + 직사각형 포함
    expect(container.querySelector('.skeleton--circle')).toBeInTheDocument()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(3)
  })
})

describe('CalendarPageSkeleton', () => {
  it('렌더링 성공', () => {
    const { container } = render(<CalendarPageSkeleton />)
    expect(container.querySelector('.skeleton-page')).toBeInTheDocument()
    expect(container.querySelectorAll('.skeleton--circle').length).toBeGreaterThanOrEqual(2)
  })
})

describe('StatsPageSkeleton', () => {
  it('렌더링 성공', () => {
    const { container } = render(<StatsPageSkeleton />)
    expect(container.querySelector('.skeleton-page')).toBeInTheDocument()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(3)
  })
})
