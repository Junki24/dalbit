import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { InvitePage } from '../InvitePage'

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('로그인 필요 상태에서 "파트너 초대" 제목 표시', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/invite/:code" element={<InvitePage />} />
      </Routes>,
      { initialEntries: ['/invite/test-code'], withAuth: true }
    )
    expect(await screen.findByText('파트너 초대')).toBeInTheDocument()
  })

  it('로그인 필요 상태에서 "로그인하기" 버튼 표시', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/invite/:code" element={<InvitePage />} />
      </Routes>,
      { initialEntries: ['/invite/test-code'], withAuth: true }
    )
    expect(await screen.findByText('로그인하기')).toBeInTheDocument()
  })

  it('초대 아이콘 💑 표시', () => {
    renderWithProviders(
      <Routes>
        <Route path="/invite/:code" element={<InvitePage />} />
      </Routes>,
      { initialEntries: ['/invite/test-code'], withAuth: true }
    )
    expect(screen.getByText('💑')).toBeInTheDocument()
  })
})
