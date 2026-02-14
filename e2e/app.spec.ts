import { test, expect } from '@playwright/test'

test.describe('달빛 앱 — 비인증 상태', () => {
  test('로그인 페이지가 표시된다', async ({ page }) => {
    await page.goto('/')
    // 인증되지 않은 상태에서는 로그인 페이지로 리다이렉트
    await expect(page.getByText('달빛')).toBeVisible({ timeout: 10_000 })
  })

  test('Google 로그인 버튼이 존재한다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /google|로그인|시작/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('페이지 타이틀이 올바르다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/달빛/)
  })

  // PWA manifest는 프로덕션 빌드에서만 주입됨 (vite-plugin-pwa)
  // 프로덕션 E2E는 `npm run build && npm run preview`로 별도 실행 필요
  test('앱 루트 요소가 존재한다', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).toBeVisible()
  })

  test('viewport meta tag가 모바일 최적화되어 있다', async ({ page }) => {
    await page.goto('/')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })
})

test.describe('달빛 앱 — 테마', () => {
  test('CSS 변수가 정의되어 있다', async ({ page }) => {
    await page.goto('/')
    // Check that CSS custom properties are defined
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
    })
    expect(bgColor).toBeTruthy()
  })
})

test.describe('달빛 앱 — 반응형', () => {
  test('모바일 뷰포트에서 레이아웃이 깨지지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // 스크롤바가 발생하지 않는지(= 수평 오버플로 없음) 확인
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('태블릿 뷰포트에서 레이아웃이 깨지지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })
})

test.describe('달빛 앱 — 접근성', () => {
  test('로그인 페이지의 버튼에 접근성 텍스트가 있다', async ({ page }) => {
    await page.goto('/')
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i)
      const text = await btn.textContent()
      const ariaLabel = await btn.getAttribute('aria-label')
      // 버튼에 텍스트 혹은 aria-label이 있어야 함
      expect(text?.trim() || ariaLabel?.trim()).toBeTruthy()
    }
  })
})

test.describe('달빛 앱 — 네비게이션', () => {
  test('존재하지 않는 경로 접근 시 리다이렉트된다', async ({ page }) => {
    await page.goto('/nonexistent-page')
    // 로그인 페이지로 리다이렉트되거나 홈으로 리다이렉트
    await page.waitForLoadState('networkidle')
    const url = page.url()
    // 404가 아닌 유효한 페이지로 리다이렉트됨
    expect(url).not.toContain('nonexistent-page')
  })
})
