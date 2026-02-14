import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { PartnerPage } from '../PartnerPage'

describe('PartnerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('파트너 미연결 상태에서 "파트너 연결 없음" 표시', () => {
    renderWithProviders(<PartnerPage />, { withAuth: true })
    expect(screen.getByText('파트너 연결 없음')).toBeInTheDocument()
  })

  it('파트너 미연결 상태에서 💑 아이콘 표시', () => {
    renderWithProviders(<PartnerPage />, { withAuth: true })
    expect(screen.getByText('💑')).toBeInTheDocument()
  })

  it('파트너 미연결 상태에서 초대 링크 안내 문구 표시', () => {
    renderWithProviders(<PartnerPage />, { withAuth: true })
    expect(screen.getByText(/파트너에게 초대 링크를 받아/)).toBeInTheDocument()
  })
})
