import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { FlowIntensity } from '@/types'
import './MigrationSection.css'

interface ExtractedPeriod {
  start_date: string
  end_date: string
  flow_intensity: FlowIntensity | null
  selected: boolean
}

interface AnalysisResult {
  periods: ExtractedPeriod[]
  confidence: string
  source_app: string | null
  notes: string | null
}

export function MigrationSection() {
  const { user } = useAuth()
  const { showToast, confirm } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])

  const handleFileSelect = async () => {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0 || !user || !isSupabaseConfigured) return

    setAnalyzing(true)
    setResult(null)

    const allPeriods: ExtractedPeriod[] = []
    let lastConfidence = 'medium'
    let lastSourceApp: string | null = null
    let lastNotes: string | null = null
    const previews: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Create preview
        const previewUrl = URL.createObjectURL(file)
        previews.push(previewUrl)

        // Convert to base64
        const base64 = await fileToBase64(file)

        // Refresh session to ensure valid access token (getSession returns cached/expired tokens)
        const { data: { session } } = await supabase.auth.refreshSession()
        if (!session) {
          showToast('로그인이 만료되었습니다. 다시 로그인해주세요.', 'error')
          setAnalyzing(false)
          return
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-screenshot`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ image: base64, mimeType: file.type }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          showToast(data.error || `이미지 ${i + 1} 분석 실패`, 'error')
          continue
        }

        if (data.periods && data.periods.length > 0) {
          allPeriods.push(
            ...data.periods.map((p: { start_date: string; end_date: string; flow_intensity: FlowIntensity | null }) => ({
              ...p,
              selected: true,
            }))
          )
        }

        lastConfidence = data.confidence || 'medium'
        lastSourceApp = data.source_app || lastSourceApp
        lastNotes = data.notes || lastNotes
      }

      setPreviewImages(previews)

      if (allPeriods.length === 0) {
        showToast('스크린샷에서 생리 기록을 찾지 못했습니다.', 'info')
        setAnalyzing(false)
        return
      }

      // Sort by start_date and deduplicate
      allPeriods.sort((a, b) => a.start_date.localeCompare(b.start_date))

      setResult({
        periods: allPeriods,
        confidence: lastConfidence,
        source_app: lastSourceApp,
        notes: lastNotes,
      })
    } catch (err) {
      console.error('Migration analysis error:', err)
      showToast('분석 중 오류가 발생했습니다.', 'error')
    } finally {
      setAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleTogglePeriod = (index: number) => {
    if (!result) return
    const updated = [...result.periods]
    updated[index] = { ...updated[index], selected: !updated[index].selected }
    setResult({ ...result, periods: updated })
  }

  const handleEditPeriod = (index: number, field: keyof ExtractedPeriod, value: string) => {
    if (!result) return
    const updated = [...result.periods]
    updated[index] = { ...updated[index], [field]: value || null }
    setResult({ ...result, periods: updated })
  }

  const handleDeletePeriod = (index: number) => {
    if (!result) return
    const updated = result.periods.filter((_, i) => i !== index)
    setResult({ ...result, periods: updated })
  }

  const handleImport = async () => {
    if (!result || !user || !isSupabaseConfigured) return

    const selected = result.periods.filter((p) => p.selected)
    if (selected.length === 0) {
      showToast('가져올 기록을 선택해주세요.', 'info')
      return
    }

    const confirmed = await confirm({
      title: '📱 데이터 가져오기',
      message: `${selected.length}건의 생리 기록을 가져옵니다.\n\n기존 같은 날짜의 기록이 있으면 덮어씁니다.`,
      confirmText: '가져오기',
      cancelText: '취소',
    })
    if (!confirmed) return

    setImporting(true)
    try {
      const periodsToImport = selected.map((p) => ({
        user_id: user.id,
        start_date: p.start_date,
        end_date: p.end_date || p.start_date,
        flow_intensity: p.flow_intensity,
        flow_intensities: {},
      }))

      const { error } = await supabase
        .from('periods')
        .upsert(periodsToImport, { onConflict: 'user_id,start_date' })

      if (error) throw error

      showToast(`${selected.length}건의 생리 기록을 가져왔습니다!`, 'success')
      setResult(null)
      setPreviewImages([])
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error('Import error:', err)
      showToast('가져오기 중 오류가 발생했습니다.', 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setPreviewImages((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url))
      return []
    })
  }

  const confidenceLabel: Record<string, string> = {
    high: '높음 ✅',
    medium: '보통 ⚠️',
    low: '낮음 ❌',
  }

  const flowOptions: { value: string; label: string }[] = [
    { value: '', label: '선택 안함' },
    { value: 'heavy', label: '많음' },
    { value: 'medium', label: '보통' },
    { value: 'light', label: '적음' },
    { value: 'spotting', label: '소량' },
  ]

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">📱 다른 앱에서 가져오기</h3>
      <p className="settings-desc">
        다른 생리주기 앱의 스크린샷을 업로드하면 AI가 기록을 분석하여 자동으로 가져옵니다.
      </p>

      {!result && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-label="스크린샷 선택"
          />
          <button
            className="btn-migration"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="migration-spinner" />
                AI 분석 중...
              </>
            ) : (
              '📷 스크린샷 업로드'
            )}
          </button>
          <p className="settings-hint">
            Flo, Clue, 봄 캘린더 등의 스크린샷을 여러 장 선택할 수 있습니다.
          </p>
        </>
      )}

      {result && (
        <div className="migration-result">
          {/* Preview images */}
          {previewImages.length > 0 && (
            <div className="migration-previews">
              {previewImages.map((url, i) => (
                <img key={i} src={url} alt={`스크린샷 ${i + 1}`} className="migration-preview-img" />
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="migration-meta">
            <span>정확도: {confidenceLabel[result.confidence] || result.confidence}</span>
            {result.source_app && <span>출처: {result.source_app}</span>}
            <span>추출: {result.periods.length}건</span>
          </div>
          {result.notes && <p className="migration-notes">{result.notes}</p>}

          {/* Extracted periods table */}
          <div className="migration-table-wrap">
            <table className="migration-table">
              <thead>
                <tr>
                  <th>✓</th>
                  <th>시작일</th>
                  <th>종료일</th>
                  <th>출혈량</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.periods.map((period, i) => (
                  <tr key={i} className={period.selected ? '' : 'migration-row-disabled'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={period.selected}
                        onChange={() => handleTogglePeriod(i)}
                        aria-label={`${period.start_date} 선택`}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={period.start_date}
                        onChange={(e) => handleEditPeriod(i, 'start_date', e.target.value)}
                        className="migration-date-input"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={period.end_date}
                        onChange={(e) => handleEditPeriod(i, 'end_date', e.target.value)}
                        className="migration-date-input"
                      />
                    </td>
                    <td>
                      <select
                        value={period.flow_intensity || ''}
                        onChange={(e) => handleEditPeriod(i, 'flow_intensity', e.target.value)}
                        className="migration-flow-select"
                      >
                        {flowOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="migration-delete-btn"
                        onClick={() => handleDeletePeriod(i)}
                        aria-label="삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="migration-actions">
            <button
              className="btn-migration-import"
              onClick={handleImport}
              disabled={importing || result.periods.filter((p) => p.selected).length === 0}
            >
              {importing ? '가져오는 중...' : `${result.periods.filter((p) => p.selected).length}건 가져오기`}
            </button>
            <button className="btn-migration-cancel" onClick={handleReset}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
