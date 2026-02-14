import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { StatsPage } from '../StatsPage'

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('데이터 없을 때 빈 상태 텍스트 표시', () => {
    renderWithProviders(<StatsPage />, { withAuth: true })
    expect(screen.getByText('데이터가 필요합니다')).toBeInTheDocument()
  })

  it('빈 상태에서 📊 아이콘 표시', () => {
    renderWithProviders(<StatsPage />, { withAuth: true })
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('빈 상태에서 안내 문구 표시', () => {
    renderWithProviders(<StatsPage />, { withAuth: true })
    expect(screen.getByText(/생리와 증상을 기록하면/)).toBeInTheDocument()
  })
})
