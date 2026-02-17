// Supabase Edge Function: send-notifications
// Triggered daily by pg_cron at 21:00 KST
// Sends smart push notifications based on user data

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:dalbit@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── CORS headers (browser fetch needs these) ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-cron-secret, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// ── Types ──
interface PushSub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface Period {
  start_date: string
  end_date: string | null
}

interface UserSettings {
  user_id: string
  display_name: string | null
  gender: 'female' | 'male'
  average_cycle_length: number
  notifications_enabled: boolean
}

interface NotificationPayload {
  title: string
  body: string
  tag: string
  url: string
}

// ── Smart notification logic ──
function determineNotification(
  periods: Period[],
  symptoms: { date: string }[],
  settings: UserSettings,
  today: string
): NotificationPayload | null {
  const avgCycle = settings.average_cycle_length || 28

  // Sort periods descending
  const sorted = [...periods].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )

  if (sorted.length === 0) {
    return {
      title: '달빛 🌙',
      body: '첫 생리 기록을 시작해보세요! 정확한 예측을 위한 첫 걸음이에요.',
      tag: 'dalbit-onboard',
      url: '/record',
    }
  }

  const lastPeriod = sorted[0]
  const lastStartDate = new Date(lastPeriod.start_date)
  const todayDate = new Date(today)
  const daysSinceLast = Math.floor(
    (todayDate.getTime() - lastStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const cycleDay = daysSinceLast + 1

  // Days until next predicted period
  const daysUntilPeriod = avgCycle - daysSinceLast
  const ovulationDay = avgCycle - 14

  // ── Priority 1: Period approaching (1-3 days) ──
  if (daysUntilPeriod >= 1 && daysUntilPeriod <= 3) {
    return {
      title: '🩸 생리 예정 알림',
      body: daysUntilPeriod === 1
        ? '내일 생리 시작 예정이에요. 준비해두세요!'
        : `생리 시작까지 ${daysUntilPeriod}일 남았어요.`,
      tag: 'dalbit-period-soon',
      url: '/',
    }
  }

  // ── Priority 2: Period predicted today ──
  if (daysUntilPeriod === 0) {
    return {
      title: '🩸 생리 예정일',
      body: '오늘 생리 시작 예정이에요. 시작했다면 기록해주세요!',
      tag: 'dalbit-period-today',
      url: '/record',
    }
  }

  // ── Priority 3: Ovulation day ──
  if (cycleDay === ovulationDay) {
    return {
      title: '🥚 배란 예정일',
      body: '오늘은 배란 예정일이에요.',
      tag: 'dalbit-ovulation',
      url: '/',
    }
  }

  // ── Priority 4: Fertile window start ──
  if (cycleDay === ovulationDay - 5) {
    return {
      title: '💫 가임기 시작',
      body: '가임기가 시작됐어요. 약 6일간 지속됩니다.',
      tag: 'dalbit-fertile',
      url: '/',
    }
  }

  // ── Priority 5: PMS warning (7 days before period) ──
  if (daysUntilPeriod === 7) {
    return {
      title: '💜 PMS 주의 시기',
      body: '생리 일주일 전이에요. 컨디션 변화에 주의하세요.',
      tag: 'dalbit-pms',
      url: '/',
    }
  }

  // ── Priority 6: No record today → remind ──
  const hasRecordToday = symptoms.some((s) => s.date === today)
  if (!hasRecordToday) {
    return {
      title: '달빛 🌙',
      body: '오늘의 컨디션을 기록해보세요!',
      tag: 'dalbit-reminder',
      url: '/record',
    }
  }

  return null
}

// ── Male user notification logic ──
function determineMaleNotification(
  partnerPeriods: Period[],
  settings: UserSettings,
  today: string
): NotificationPayload | null {
  const avgCycle = settings.average_cycle_length || 28

  // Sort periods descending
  const sorted = [...partnerPeriods].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )

  if (sorted.length === 0) {
    return null
  }

  const lastPeriod = sorted[0]
  const lastStartDate = new Date(lastPeriod.start_date)
  const todayDate = new Date(today)
  const daysSinceLast = Math.floor(
    (todayDate.getTime() - lastStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const cycleDay = daysSinceLast + 1

  // Days until next predicted period
  const daysUntilPeriod = avgCycle - daysSinceLast
  const ovulationDay = avgCycle - 14

  // ── Priority 1: Partner's period approaching (1-3 days) ──
  if (daysUntilPeriod >= 1 && daysUntilPeriod <= 3) {
    return {
      title: '🩸 파트너 생리 예정',
      body: daysUntilPeriod === 1
        ? '파트너 생리 예정일이 내일이에요. 따뜻하게 챙겨주세요!'
        : `파트너 생리 예정일이 ${daysUntilPeriod}일 남았어요. 따뜻하게 챙겨주세요 💜`,
      tag: 'dalbit-partner-period-soon',
      url: '/',
    }
  }

  // ── Priority 2: Partner's period today ──
  if (daysUntilPeriod === 0) {
    return {
      title: '🩸 파트너 생리 예정일',
      body: '오늘은 파트너의 생리 예정일이에요. 편안하게 해주세요 ☕',
      tag: 'dalbit-partner-period-today',
      url: '/',
    }
  }

  // ── Priority 3: Partner menstruating (cycle day 1-5) ──
  if (cycleDay >= 1 && cycleDay <= 5) {
    return {
      title: '🩸 파트너가 생리 중이에요',
      body: '파트너가 생리 중이에요. 편안하게 해주세요 ☕',
      tag: 'dalbit-partner-menstruating',
      url: '/',
    }
  }

  // ── Priority 4: Partner's ovulation day ──
  if (cycleDay === ovulationDay) {
    return {
      title: '🥚 파트너 배란 예정일',
      body: '오늘은 파트너의 배란 예정일이에요 🥚',
      tag: 'dalbit-partner-ovulation',
      url: '/',
    }
  }

  // ── Priority 5: Partner's fertile window ──
  if (cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay) {
    return {
      title: '🌸 파트너 가임기',
      body: '파트너가 가임기에 있어요 🌸',
      tag: 'dalbit-partner-fertile',
      url: '/',
    }
  }

  // ── Default: Partner's cycle day ──
  return {
    title: '달빛 🌙',
    body: `파트너의 주기 ${cycleDay}일째예요. 달빛에서 확인해보세요 🌙`,
    tag: 'dalbit-partner-cycle',
    url: '/',
  }
}

// ── Main handler ──
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization (cron, service role, or authenticated user)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    let filterUserId: string | null = null

    // Check if JWT has service_role
    const isServiceRole = (() => {
      try {
        const token = authHeader?.replace('Bearer ', '') ?? ''
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.role === 'service_role'
      } catch { return false }
    })()

    if (isServiceRole) {
      // Service role — send to all
    } else if (cronSecret === Deno.env.get('CRON_SECRET')) {
      // Cron job — send to all
    } else if (authHeader?.startsWith('Bearer ')) {
      // Authenticated user — send only to themselves (test mode)
      // Pass token directly to getUser() — Deno has no session storage
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return jsonResponse({ error: 'Unauthorized: ' + (error?.message ?? 'invalid token') }, 401)
      }
      filterUserId = user.id
    } else {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Check for broadcast mode (one-time announcements)
    let broadcastPayload: NotificationPayload | null = null
    try {
      const body = await req.json().catch(() => null)
      if (body?.broadcast && body?.title && body?.body) {
        broadcastPayload = {
          title: body.title,
          body: body.body,
          tag: body.tag || 'dalbit-announce',
          url: body.url || '/',
        }
      }
    } catch { /* no body */ }

    const today = new Date().toISOString().slice(0, 10)
    let sent = 0
    let failed = 0
    let skipped = 0
    const errors: string[] = []

    // ══════════════════════════════════════════════
    // 1. FEMALE NOTIFICATIONS (기존 여성 유저 알림)
    // ══════════════════════════════════════════════
    let usersQuery = supabase
      .from('user_settings')
      .select('user_id, display_name, gender, average_cycle_length, notifications_enabled')
      .eq('notifications_enabled', true)
      .eq('gender', 'female')

    if (filterUserId) {
      usersQuery = usersQuery.eq('user_id', filterUserId)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError || !users) {
      return jsonResponse({ error: 'DB error: ' + (usersError?.message ?? 'no users') }, 500)
    }

    for (const user of users as UserSettings[]) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.user_id)

      if (!subs || subs.length === 0) { skipped++; continue }

      const { data: periods } = await supabase
        .from('periods')
        .select('start_date, end_date')
        .eq('user_id', user.user_id)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
        .limit(6)

      const { data: symptoms } = await supabase
        .from('symptoms')
        .select('date')
        .eq('user_id', user.user_id)
        .eq('date', today)

      const notification = broadcastPayload ?? determineNotification(
        (periods ?? []) as Period[],
        (symptoms ?? []) as { date: string }[],
        user,
        today
      )

      if (!notification) { skipped++; continue }

      for (const sub of subs as PushSub[]) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(notification)
          )
          sent++
        } catch (err: unknown) {
          const pushErr = err as { statusCode?: number; body?: string }
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
          errors.push(`sub=${sub.id}: ${pushErr.statusCode ?? 'unknown'}`)
          failed++
        }
      }
    }

    // ══════════════════════════════════════════════
    // 2. MALE NOTIFICATIONS (남성 유저 파트너 알림)
    // ══════════════════════════════════════════════
    let maleQuery = supabase
      .from('user_settings')
      .select('user_id, display_name, gender, average_cycle_length, notifications_enabled')
      .eq('notifications_enabled', true)
      .eq('gender', 'male')

    if (filterUserId) {
      maleQuery = maleQuery.eq('user_id', filterUserId)
    }

    const { data: maleUsers } = await maleQuery

    for (const maleUser of (maleUsers ?? []) as UserSettings[]) {
      // Get push subscriptions
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', maleUser.user_id)

      if (!subs || subs.length === 0) { skipped++; continue }

      // Find accepted partner link where this male is the partner
      const { data: link } = await supabase
        .from('partner_sharing')
        .select('owner_id')
        .eq('partner_user_id', maleUser.user_id)
        .eq('accepted', true)
        .single()

      if (!link) { skipped++; continue }

      // Fetch partner's (owner's) settings for cycle length
      const { data: ownerSettings } = await supabase
        .from('user_settings')
        .select('average_cycle_length')
        .eq('user_id', link.owner_id)
        .single()

      // Fetch partner's periods
      const { data: partnerPeriods } = await supabase
        .from('periods')
        .select('start_date, end_date')
        .eq('user_id', link.owner_id)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
        .limit(6)

      const notification = broadcastPayload ?? determineMaleNotification(
        (partnerPeriods ?? []) as Period[],
        { ...maleUser, average_cycle_length: ownerSettings?.average_cycle_length ?? 28 },
        today
      )

      if (!notification) { skipped++; continue }

      for (const sub of subs as PushSub[]) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(notification)
          )
          sent++
        } catch (err: unknown) {
          const pushErr = err as { statusCode?: number; body?: string }
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
          errors.push(`sub=${sub.id}: ${pushErr.statusCode ?? 'unknown'}`)
          failed++
        }
      }
    }

    return jsonResponse({ ok: true, sent, failed, skipped, errors, date: today })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
