import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { SYMPTOM_LABELS } from '@/types'
import type { Period, Symptom, SymptomType, UserSettings } from '@/types'

interface ExportData {
  periods: Period[]
  symptoms: Symptom[]
  userSettings: UserSettings | null
}

/**
 * Lazy-load @react-pdf/renderer and generate a downloadable PDF.
 * The library is ~600KB, so we dynamic-import to keep the initial bundle small.
 */
export async function generatePdfReport({ periods, symptoms, userSettings }: ExportData) {
  const [reactPdf, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('react'),
  ])

  const { Document, Page, Text, View, StyleSheet, Font, pdf } = reactPdf

  // Register Korean font (Noto Sans KR from Google Fonts CDN — TTF only)
  Font.register({
    family: 'NotoSansKR',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuo7eLTq8H4hfeE.ttf',
        fontWeight: 700,
      },
    ],
  })

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'NotoSansKR',
      padding: 40,
      fontSize: 10,
      color: '#1e293b',
      lineHeight: 1.6,
    },
    title: {
      fontSize: 20,
      fontWeight: 700,
      color: '#7c3aed',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 20,
    },
    disclaimer: {
      backgroundColor: '#fffbeb',
      borderWidth: 1,
      borderColor: '#fde68a',
      borderRadius: 6,
      padding: 10,
      fontSize: 8,
      color: '#92400e',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: '#374151',
      marginTop: 18,
      marginBottom: 10,
      paddingBottom: 4,
      borderBottomWidth: 2,
      borderBottomColor: '#e5e7eb',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    statBox: {
      flex: 1,
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 700,
      color: '#7c3aed',
    },
    statLabel: {
      fontSize: 8,
      color: '#64748b',
      marginTop: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderBottomWidth: 2,
      borderBottomColor: '#e2e8f0',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    tableRowEven: {
      backgroundColor: '#fafbfc',
    },
    thCell: {
      fontWeight: 700,
      fontSize: 9,
    },
    tdCell: {
      fontSize: 9,
    },
    col1: { width: '28%' },
    col2: { width: '22%' },
    col3: { width: '22%' },
    col4: { width: '28%' },
    symptomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      gap: 8,
    },
    symptomName: {
      width: 80,
      fontWeight: 700,
      fontSize: 9,
    },
    symptomCount: {
      width: 36,
      fontSize: 8,
      color: '#64748b',
    },
    severityBarBg: {
      width: 80,
      height: 6,
      backgroundColor: '#e5e7eb',
      borderRadius: 3,
    },
    severityBarFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: '#f59e0b',
    },
    symptomSeverity: {
      fontSize: 8,
      color: '#64748b',
      marginLeft: 4,
    },
    footer: {
      marginTop: 30,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      fontSize: 7,
      color: '#94a3b8',
      textAlign: 'center',
    },
  })

  // ── Compute data ──
  const sorted = [...periods].sort(
    (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
  )

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
  const displayName = userSettings?.display_name

  // ── Build period table rows ──
  const periodRows = sorted.slice(0, 12).map((p, i) => {
    const next = sorted[i + 1]
    const cycleLen = next
      ? differenceInDays(parseISO(p.start_date), parseISO(next.start_date))
      : null
    const periodLen = p.end_date
      ? differenceInDays(parseISO(p.end_date), parseISO(p.start_date)) + 1
      : null

    return {
      startDate: format(parseISO(p.start_date), 'yyyy.M.d'),
      endDate: p.end_date ? format(parseISO(p.end_date), 'M.d') : '-',
      periodLen: periodLen ? `${periodLen}일` : '-',
      cycleLen: cycleLen && cycleLen > 0 && cycleLen < 60 ? `${cycleLen}일` : '-',
    }
  })

  // ── Create PDF document using createElement (no JSX in .ts) ──
  const h = React.createElement

  const doc = h(Document, null,
    h(Page, { size: 'A4', style: styles.page },
      // Title
      h(Text, { style: styles.title }, '달빛 — 생리주기 리포트'),
      h(Text, { style: styles.subtitle },
        `${displayName ? `${displayName} · ` : ''}생성일: ${today}`
      ),

      // Disclaimer
      h(View, { style: styles.disclaimer },
        h(Text, null, '이 리포트는 참고용이며, 의학적 진단을 대체하지 않습니다. 정확한 진단은 전문 의료인과 상담하세요.')
      ),

      // Cycle Stats
      h(Text, { style: styles.sectionTitle }, '주기 통계'),
      h(View, { style: styles.statsGrid },
        h(View, { style: styles.statBox },
          h(Text, { style: styles.statValue }, avgCycle !== null ? String(avgCycle) : '-'),
          h(Text, { style: styles.statLabel }, '평균 주기 (일)')
        ),
        h(View, { style: styles.statBox },
          h(Text, { style: styles.statValue },
            minCycle !== null && maxCycle !== null ? `${minCycle}~${maxCycle}` : '-'
          ),
          h(Text, { style: styles.statLabel }, '주기 범위 (일)')
        ),
        h(View, { style: styles.statBox },
          h(Text, { style: styles.statValue }, String(sorted.length)),
          h(Text, { style: styles.statLabel }, '기록된 주기 수')
        )
      ),

      // Period Table
      h(Text, { style: styles.sectionTitle }, '생리 기록 (최근 12회)'),
      h(View, { style: styles.tableHeader },
        h(Text, { style: { ...styles.thCell, ...styles.col1 } }, '시작일'),
        h(Text, { style: { ...styles.thCell, ...styles.col2 } }, '종료일'),
        h(Text, { style: { ...styles.thCell, ...styles.col3 } }, '기간'),
        h(Text, { style: { ...styles.thCell, ...styles.col4 } }, '주기')
      ),
      ...periodRows.map((row, i) =>
        h(View, { key: String(i), style: { ...styles.tableRow, ...(i % 2 === 1 ? styles.tableRowEven : {}) } },
          h(Text, { style: { ...styles.tdCell, ...styles.col1 } }, row.startDate),
          h(Text, { style: { ...styles.tdCell, ...styles.col2 } }, row.endDate),
          h(Text, { style: { ...styles.tdCell, ...styles.col3 } }, row.periodLen),
          h(Text, { style: { ...styles.tdCell, ...styles.col4 } }, row.cycleLen)
        )
      ),

      // Top Symptoms
      ...(topSymptoms.length > 0
        ? [
            h(Text, { style: styles.sectionTitle, key: 'symptom-title' }, '증상 요약'),
            ...topSymptoms.map(([type, { count, totalSeverity }]) => {
              const avgSev = Math.round((totalSeverity / count) * 10) / 10
              return h(View, { key: type, style: styles.symptomRow },
                h(Text, { style: styles.symptomName }, SYMPTOM_LABELS[type]),
                h(Text, { style: styles.symptomCount }, `${count}회`),
                h(View, { style: styles.severityBarBg },
                  h(View, { style: { ...styles.severityBarFill, width: `${(avgSev / 5) * 100}%` } })
                ),
                h(Text, { style: styles.symptomSeverity }, `${avgSev}/5`)
              )
            }),
          ]
        : []),

      // Footer
      h(Text, { style: styles.footer }, '달빛 v1.0.0 · 이 리포트는 자동 생성되었습니다.')
    )
  )

  // Generate blob and trigger download
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dalbit-report-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
