// Supabase Edge Function: analyze-screenshot
// Accepts a screenshot image, sends to Gemini 2.5 Flash Vision API,
// and returns extracted period data as structured JSON.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

const EXTRACTION_PROMPT = `당신은 생리주기 앱 스크린샷에서 데이터를 추출하는 전문가입니다.

이 스크린샷을 분석하여 다음 정보를 JSON으로 추출해주세요:

1. 생리 기간 목록 (시작일, 종료일)
2. 출혈량 (heavy/medium/light/spotting 중 하나, 확인 불가시 null)

반환 형식:
{
  "periods": [
    {
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "flow_intensity": "heavy" | "medium" | "light" | "spotting" | null
    }
  ],
  "confidence": "high" | "medium" | "low",
  "source_app": "앱 이름 (추정 가능한 경우, 아니면 null)",
  "notes": "추출 시 참고사항 (한국어)"
}

규칙:
- 날짜는 반드시 YYYY-MM-DD 형식
- 확인할 수 없는 정보는 null
- 연도가 보이지 않으면 가장 최근 연도로 추정
- 생리 기간이 아닌 배란일, 가임기 등은 무시
- periods 배열은 start_date 오름차순 정렬
- 스크린샷에서 생리 기록을 찾을 수 없으면 periods를 빈 배열로 반환
- JSON만 반환하고, 다른 텍스트는 포함하지 마세요`

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Check Gemini API key
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: 'Gemini API 키가 설정되지 않았습니다.' }, 500)
    }

    // 2. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: '로그인이 필요합니다.' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: '인증 실패: ' + (authError?.message ?? 'invalid token') }, 401)
    }

    // 3. Parse request body
    const body = await req.json()
    const { image, mimeType } = body as { image?: string; mimeType?: string }

    if (!image) {
      return jsonResponse({ error: '이미지가 필요합니다.' }, 400)
    }

    const resolvedMimeType = mimeType || 'image/png'

    // 4. Call Gemini 2.5 Flash Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: resolvedMimeType, data: image } },
            { text: EXTRACTION_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errText)
      return jsonResponse({
        error: `Gemini API 오류 (${geminiResponse.status})`,
        detail: errText,
      }, 502)
    }

    const geminiData = await geminiResponse.json()

    // 5. Extract text from Gemini response
    const candidate = geminiData?.candidates?.[0]
    const rawText = candidate?.content?.parts?.[0]?.text

    if (!rawText) {
      return jsonResponse({
        error: '이미지에서 데이터를 추출할 수 없습니다.',
        raw: geminiData,
      }, 422)
    }

    // 6. Parse JSON from Gemini response
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim())
      } else {
        return jsonResponse({
          error: '추출 결과를 파싱할 수 없습니다.',
          raw_text: rawText,
        }, 422)
      }
    }

    // 7. Validate and sanitize
    const periods = Array.isArray(parsed.periods) ? parsed.periods.map((p: Record<string, unknown>) => ({
      start_date: String(p.start_date || ''),
      end_date: String(p.end_date || p.start_date || ''),
      flow_intensity: ['heavy', 'medium', 'light', 'spotting'].includes(String(p.flow_intensity))
        ? String(p.flow_intensity)
        : null,
    })).filter((p: { start_date: string }) => /^\d{4}-\d{2}-\d{2}$/.test(p.start_date)) : []

    return jsonResponse({
      periods,
      confidence: parsed.confidence || 'medium',
      source_app: parsed.source_app || null,
      notes: parsed.notes || null,
      user_id: user.id,
    })

  } catch (err) {
    console.error('analyze-screenshot error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
