/**
 * Auth 진단 유틸리티
 * 
 * 브라우저 콘솔에서 실행하거나, 설정 페이지에 디버그 버튼으로 연결해서
 * 각 auth 단계가 어디서 실패하는지 격리 테스트하는 도구.
 * 
 * 사용법 (브라우저 콘솔):
 *   import('/src/lib/auth-diagnostic.ts').then(m => m.runAuthDiagnostic())
 * 
 * 또는 컴포넌트에서:
 *   import { runAuthDiagnostic } from '@/lib/auth-diagnostic'
 *   <button onClick={runAuthDiagnostic}>Auth 진단</button>
 */

import { supabase } from './supabase'

interface DiagnosticResult {
  step: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
  data?: unknown
}

export async function runAuthDiagnostic(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []

  console.log('🔍 === Auth 진단 시작 ===')

  // ---- Step 1: getSession ----
  console.log('\n📋 Step 1: getSession()')
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      results.push({ step: '1-getSession', status: 'fail', detail: `에러: ${error.message}`, data: error })
      console.error('  ❌ getSession 에러:', error.message)
    } else if (!session) {
      results.push({ step: '1-getSession', status: 'fail', detail: 'session이 null — 로그인 상태가 아님' })
      console.error('  ❌ session이 null')
    } else {
      const expiresAt = session.expires_at ?? 0
      const now = Math.floor(Date.now() / 1000)
      const remaining = expiresAt - now

      if (remaining <= 0) {
        results.push({
          step: '1-getSession',
          status: 'warn',
          detail: `토큰 만료됨 (${Math.abs(remaining)}초 전)`,
          data: { access_token: session.access_token?.substring(0, 20) + '...', expires_at: expiresAt },
        })
        console.warn(`  ⚠️ 토큰 만료됨 (${Math.abs(remaining)}초 전)`)
      } else {
        results.push({
          step: '1-getSession',
          status: 'pass',
          detail: `유효 (${remaining}초 남음), user: ${session.user?.email}`,
          data: { access_token: session.access_token?.substring(0, 20) + '...', expires_at: expiresAt, remaining },
        })
        console.log(`  ✅ 유효한 세션 (${remaining}초 남음) — ${session.user?.email}`)
      }
    }
  } catch (err) {
    results.push({ step: '1-getSession', status: 'fail', detail: `예외: ${String(err)}` })
    console.error('  ❌ 예외:', err)
  }

  // ---- Step 2: refreshSession ----
  console.log('\n📋 Step 2: refreshSession()')
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      results.push({ step: '2-refreshSession', status: 'fail', detail: `에러: ${error.message}`, data: error })
      console.error('  ❌ refreshSession 에러:', error.message)
    } else if (!session) {
      results.push({ step: '2-refreshSession', status: 'fail', detail: 'refreshSession 후 session이 null' })
      console.error('  ❌ refreshSession 후 session null')
    } else {
      results.push({
        step: '2-refreshSession',
        status: 'pass',
        detail: `새 토큰 발급됨, user: ${session.user?.email}`,
        data: { access_token: session.access_token?.substring(0, 20) + '...' },
      })
      console.log(`  ✅ 새 토큰 발급 — ${session.user?.email}`)
    }
  } catch (err) {
    results.push({ step: '2-refreshSession', status: 'fail', detail: `예외: ${String(err)}` })
    console.error('  ❌ 예외:', err)
  }

  // ---- Step 3: getUser (서버 검증) ----
  console.log('\n📋 Step 3: getUser() — 서버에서 토큰 검증')
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      results.push({ step: '3-getUser', status: 'fail', detail: `에러: ${error.message}`, data: error })
      console.error('  ❌ getUser 에러:', error.message)
    } else if (!user) {
      results.push({ step: '3-getUser', status: 'fail', detail: 'getUser 결과 user가 null' })
      console.error('  ❌ user null')
    } else {
      results.push({
        step: '3-getUser',
        status: 'pass',
        detail: `서버 인증 성공: ${user.email} (${user.id})`,
      })
      console.log(`  ✅ 서버 인증 성공 — ${user.email}`)
    }
  } catch (err) {
    results.push({ step: '3-getUser', status: 'fail', detail: `예외: ${String(err)}` })
    console.error('  ❌ 예외:', err)
  }

  // ---- Step 4: functions.invoke (실제 Edge Function 호출) ----
  console.log('\n📋 Step 4: functions.invoke — Edge Function 직접 호출')
  try {
    // 1x1 white PNG (minimal, valid image)
    const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

    const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
      body: { image: minimalPng, mimeType: 'image/png' },
    })

    if (error) {
      results.push({
        step: '4-functions.invoke',
        status: 'fail',
        detail: `Edge Function 에러: ${error.message}`,
        data: error,
      })
      console.error('  ❌ Edge Function 에러:', error.message)
    } else {
      results.push({
        step: '4-functions.invoke',
        status: 'pass',
        detail: `Edge Function 성공 — periods: ${data?.periods?.length ?? 0}건`,
        data,
      })
      console.log('  ✅ Edge Function 호출 성공:', data)
    }
  } catch (err) {
    results.push({ step: '4-functions.invoke', status: 'fail', detail: `예외: ${String(err)}` })
    console.error('  ❌ 예외:', err)
  }

  // ---- Step 5: 수동 fetch로 토큰 직접 검증 ----
  console.log('\n📋 Step 5: 수동 fetch — 토큰을 직접 꺼내서 호출')
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      results.push({ step: '5-manual-fetch', status: 'fail', detail: '세션 없음 — 수동 테스트 불가' })
      console.error('  ❌ 세션 없어서 수동 테스트 불가')
    } else {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-screenshot`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        results.push({
          step: '5-manual-fetch',
          status: 'fail',
          detail: `HTTP ${res.status}: ${body.error || JSON.stringify(body)}`,
          data: { status: res.status, body },
        })
        console.error(`  ❌ HTTP ${res.status}:`, body)
      } else {
        results.push({
          step: '5-manual-fetch',
          status: 'pass',
          detail: `수동 fetch 성공 — HTTP ${res.status}`,
          data: body,
        })
        console.log('  ✅ 수동 fetch 성공:', body)
      }
    }
  } catch (err) {
    results.push({ step: '5-manual-fetch', status: 'fail', detail: `예외: ${String(err)}` })
    console.error('  ❌ 예외:', err)
  }

  // ---- Summary ----
  console.log('\n🔍 === 진단 결과 요약 ===')
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warned = results.filter(r => r.status === 'warn').length

  console.log(`  ✅ 성공: ${passed}  ⚠️ 경고: ${warned}  ❌ 실패: ${failed}`)
  console.log('')

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌'
    console.log(`  ${icon} [${r.step}] ${r.detail}`)
  }

  // 진단 기반 처방
  console.log('\n💊 === 처방 ===')
  const step1 = results.find(r => r.step === '1-getSession')
  const step2 = results.find(r => r.step === '2-refreshSession')
  const step3 = results.find(r => r.step === '3-getUser')
  const step4 = results.find(r => r.step === '4-functions.invoke')
  const step5 = results.find(r => r.step === '5-manual-fetch')

  if (step1?.status === 'fail' && step2?.status === 'fail') {
    console.log('  🔴 세션 완전 소실 — localStorage에서 세션이 사라짐')
    console.log('     → 원인: 모바일 브라우저 메모리 정리, 쿠키/스토리지 삭제')
    console.log('     → 해결: 재로그인 필요')
  } else if (step1?.status === 'warn' && step2?.status === 'pass') {
    console.log('  🟡 토큰 만료됐지만 refresh 성공 — autoRefreshToken이 제때 안 돌았음')
    console.log('     → 해결: functions.invoke 전에 refreshSession() 선행 호출')
  } else if (step3?.status === 'fail' && step1?.status === 'pass') {
    console.log('  🔴 로컬 세션은 있지만 서버에서 거부 — 토큰이 무효화됨')
    console.log('     → 원인: 비밀번호 변경, 세션 강제 만료, JWT secret 변경')
    console.log('     → 해결: signOut → 재로그인')
  } else if (step4?.status === 'fail' && step5?.status === 'pass') {
    console.log('  🟡 functions.invoke는 실패하는데 수동 fetch는 성공')
    console.log('     → 원인: functions.invoke 내부 토큰 주입 문제')
    console.log('     → 해결: 수동 fetch로 전환하되, refreshSession() 선행')
  } else if (step4?.status === 'fail' && step5?.status === 'fail') {
    console.log('  🔴 둘 다 실패 — Edge Function이 토큰 자체를 거부')
    console.log('     → 원인: Edge Function의 auth 검증 로직 문제 또는 토큰 만료')
  } else if (step4?.status === 'pass') {
    console.log('  🟢 모든 auth 레이어 정상 — 문제가 재현되지 않음')
    console.log('     → 간헐적 문제일 수 있음. 모바일에서 재테스트 필요')
  }

  console.log('\n🔍 === 진단 완료 ===')

  return results
}

// 글로벌에 등록 — 브라우저 콘솔에서 바로 호출 가능
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__authDiag = runAuthDiagnostic
}
