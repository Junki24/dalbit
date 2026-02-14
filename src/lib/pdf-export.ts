import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { SYMPTOM_LABELS, SYMPTOM_ICONS } from '@/types'
import type { Period, Symptom, SymptomType, UserSettings } from '@/types'

interface ExportData {
  periods: Period[]
  symptoms: Symptom[]
  userSettings: UserSettings | null
}

export function generatePdfReport({ periods, symptoms, userSettings }: ExportData) {
  const sorted = [...periods].sort(
    (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
  )

  // Calculate cycle stats
  const cycleLengths: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = differenceInDays(
      parseISO(sorted[i].start_date),
      parseISO(sorted[i + 1].start_date)
    )
    if (diff > 0 && diff < 60) cycleLengths.push(diff)
  }

  const avgCycle = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null
  const minCycle = cycleLengths.length > 0 ? Math.min(...cycleLengths) : null
  const maxCycle = cycleLengths.length > 0 ? Math.max(...cycleLengths) : null

  // Top symptoms
  const symptomCounts = new Map<SymptomType, { count: number; totalSeverity: number }>()
  for (const s of symptoms) {
    const type = s.symptom_type as SymptomType
    const entry = symptomCounts.get(type) ?? { count: 0, totalSeverity: 0 }
    entry.count += 1
    entry.totalSeverity += s.severity
    symptomCounts.set(type, entry)
  }

  const topSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  const today = format(new Date(), 'yyyy년 M월 d일', { locale: ko })

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>달빛 - 생리주기 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', system-ui, sans-serif; color: #1e293b; line-height: 1.7; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.6rem; color: #7c3aed; margin-bottom: 4px; }
    h2 { font-size: 1.1rem; color: #374151; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    .subtitle { color: #64748b; font-size: 0.85rem; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-value { font-size: 1.4rem; font-weight: 800; color: #7c3aed; }
    .stat-label { font-size: 0.75rem; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.85rem; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) { background: #fafbfc; }
    .symptom-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .severity-bar { height: 8px; border-radius: 4px; background: #e5e7eb; width: 100px; overflow: hidden; }
    .severity-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #94a3b8; text-align: center; }
    .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 0.78rem; color: #92400e; margin: 20px 0; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🌙 달빛 — 생리주기 리포트</h1>
  <p class="subtitle">${userSettings?.display_name ? `${userSettings.display_name} · ` : ''}생성일: ${today}</p>

  <div class="disclaimer">
    ⚠️ 이 리포트는 참고용이며, 의학적 진단을 대체하지 않습니다. 정확한 진단은 전문 의료인과 상담하세요.
  </div>

  <h2>📊 주기 통계</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-value">${avgCycle ?? '-'}</div>
      <div class="stat-label">평균 주기 (일)</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${minCycle && maxCycle ? `${minCycle}~${maxCycle}` : '-'}</div>
      <div class="stat-label">주기 범위 (일)</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${sorted.length}</div>
      <div class="stat-label">기록된 주기 수</div>
    </div>
  </div>

  <h2>📅 생리 기록 (최근 12회)</h2>
  <table>
    <thead>
      <tr><th>시작일</th><th>종료일</th><th>기간</th><th>주기</th></tr>
    </thead>
    <tbody>
      ${sorted.slice(0, 12).map((p, i) => {
        const next = sorted[i + 1]
        const cycleLen = next
          ? differenceInDays(parseISO(p.start_date), parseISO(next.start_date))
          : null
        const periodLen = p.end_date
          ? differenceInDays(parseISO(p.end_date), parseISO(p.start_date)) + 1
          : null
        return `<tr>
          <td>${format(parseISO(p.start_date), 'yyyy.M.d')}</td>
          <td>${p.end_date ? format(parseISO(p.end_date), 'M.d') : '-'}</td>
          <td>${periodLen ? `${periodLen}일` : '-'}</td>
          <td>${cycleLen && cycleLen > 0 && cycleLen < 60 ? `${cycleLen}일` : '-'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  ${topSymptoms.length > 0 ? `
  <h2>📝 증상 요약</h2>
  ${topSymptoms.map(([type, { count, totalSeverity }]) => {
    const avgSev = Math.round((totalSeverity / count) * 10) / 10
    return `<div class="symptom-row">
      <span style="width:24px">${SYMPTOM_ICONS[type]}</span>
      <span style="width:80px;font-weight:500">${SYMPTOM_LABELS[type]}</span>
      <span style="width:40px;color:#64748b;font-size:0.8rem">${count}회</span>
      <div class="severity-bar"><div class="severity-fill" style="width:${(avgSev / 5) * 100}%"></div></div>
      <span style="font-size:0.8rem;color:#64748b">심각도 ${avgSev}/5</span>
    </div>`
  }).join('')}
  ` : ''}

  <div class="footer">
    달빛 v1.0.0 · 이 리포트는 자동 생성되었습니다.
  </div>
</body>
</html>`

  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}
