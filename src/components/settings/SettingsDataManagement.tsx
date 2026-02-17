import { useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserSettings, Period, Symptom, Medication, MedicationIntake } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { MigrationSection } from '@/components/MigrationSection'

interface SettingsDataManagementProps {
  user: User | null
  userSettings: UserSettings | null
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  showToast: (msg: string, type: 'success' | 'error') => void
  confirm: (opts: {
    title: string
    message: string
    confirmText: string
    cancelText: string
    danger?: boolean
  }) => Promise<boolean>
  periods: Period[]
  symptoms: Symptom[]
  medications: Medication[]
  medicationIntakes: MedicationIntake[]
}

export function SettingsDataManagement({
  user,
  userSettings,
  updateUserSettings,
  showToast,
  confirm,
  periods,
  symptoms,
  medications,
  medicationIntakes,
}: SettingsDataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleExportData = async () => {
    // 내보내기에는 soft-deleted 포함 — 완전한 백업
    let allPeriods = periods
    if (user && isSupabaseConfigured) {
      const { data } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
      if (data) allPeriods = data
    }

    // Fetch all medication intakes (not just today's)
    let allIntakes = medicationIntakes
    if (user && isSupabaseConfigured) {
      const { data } = await supabase
        .from('medication_intakes')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })
      if (data) allIntakes = data
    }

    // Fetch all intimacy records
    let allIntimacy: Record<string, unknown>[] = []
    if (user && isSupabaseConfigured) {
      const { data } = await supabase
        .from('intimacy_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      if (data) allIntimacy = data
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: user?.email,
      settings: userSettings,
      periods: allPeriods,
      symptoms,
      medications,
      medication_intakes: allIntakes,
      intimacy_records: allIntimacy,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dalbit-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportData = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !user || !isSupabaseConfigured) return

    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate structure
      if (!data.periods && !data.symptoms && !data.settings && !data.medications && !data.intimacy_records) {
        showToast('올바른 달빛 백업 파일이 아닙니다.', 'error')
        return
      }

      const confirmed = await confirm({
        title: '📤 데이터 복원',
        message: `다음 데이터를 복원합니다:\n\n• 생리 기록: ${data.periods?.length ?? 0}건\n• 증상 기록: ${data.symptoms?.length ?? 0}건\n• 약 정보: ${data.medications?.length ?? 0}건\n• 복용 기록: ${data.medication_intakes?.length ?? 0}건\n• 관계 기록: ${data.intimacy_records?.length ?? 0}건\n${data.settings ? '• 설정 정보 포함' : ''}\n\n기존 데이터와 병합됩니다.`,
        confirmText: '복원',
        cancelText: '취소',
      })
      if (!confirmed) return

      let importedCount = 0

      // Import periods
      if (data.periods?.length > 0) {
        const periodsToImport = data.periods.map((p: Record<string, unknown>) => ({
          id: p.id,
          user_id: user.id,
          start_date: p.start_date,
          end_date: p.end_date ?? null,
          flow_intensity: p.flow_intensity ?? null,
          flow_intensities: (p.flow_intensities as Record<string, string>) ?? {},
          deleted_at: p.deleted_at ?? null,
        }))
        const { error } = await supabase
          .from('periods')
          .upsert(periodsToImport, { onConflict: 'id' })
        if (!error) importedCount += periodsToImport.length
      }

      // Import symptoms
      if (data.symptoms?.length > 0) {
        const symptomsToImport = data.symptoms.map((s: Record<string, unknown>) => ({
          id: s.id,
          user_id: user.id,
          date: s.date,
          symptom_type: s.symptom_type,
          severity: s.severity ?? 3,
          notes: s.notes ?? null,
        }))
        const { error } = await supabase
          .from('symptoms')
          .upsert(symptomsToImport, { onConflict: 'id' })
        if (!error) importedCount += symptomsToImport.length
      }

      // Import medications
      if (data.medications?.length > 0) {
        const medsToImport = data.medications.map((m: Record<string, unknown>) => ({
          id: m.id,
          user_id: user.id,
          name: m.name,
          type: m.type ?? 'otc',
          form: m.form ?? null,
          strength: m.strength ?? null,
          hospital: m.hospital ?? null,
          doctor: m.doctor ?? null,
          prescribed_date: m.prescribed_date ?? null,
          prescription_notes: m.prescription_notes ?? null,
          prescription_days: m.prescription_days ?? null,
          notes: m.notes ?? null,
          is_active: m.is_active ?? true,
        }))
        const { error } = await supabase
          .from('medications')
          .upsert(medsToImport, { onConflict: 'id' })
        if (!error) importedCount += medsToImport.length
      }

      // Import medication intakes
      if (data.medication_intakes?.length > 0) {
        const intakesToImport = data.medication_intakes.map((i: Record<string, unknown>) => ({
          id: i.id,
          user_id: user.id,
          medication_id: i.medication_id ?? null,
          medication_name: i.medication_name,
          taken_at: i.taken_at,
          dosage: i.dosage ?? null,
          note: i.note ?? null,
        }))
        const { error } = await supabase
          .from('medication_intakes')
          .upsert(intakesToImport, { onConflict: 'id' })
        if (!error) importedCount += intakesToImport.length
      }

      // Import intimacy records
      if (data.intimacy_records?.length > 0) {
        const intimacyToImport = data.intimacy_records.map((r: Record<string, unknown>) => ({
          id: r.id,
          user_id: user.id,
          date: r.date,
          time_of_day: r.time_of_day ?? null,
          protection_used: r.protection_used ?? null,
          protection_method: r.protection_method ?? null,
          note: r.note ?? null,
        }))
        const { error } = await supabase
          .from('intimacy_records')
          .upsert(intimacyToImport, { onConflict: 'id' })
        if (!error) importedCount += intimacyToImport.length
      }

      // Import settings
      if (data.settings) {
        await updateUserSettings({
          display_name: data.settings.display_name ?? null,
          average_cycle_length: data.settings.average_cycle_length ?? 28,
          average_period_length: data.settings.average_period_length ?? 5,
          prediction_months: data.settings.prediction_months ?? 3,
          gender: data.settings.gender ?? 'female',
        })
      }

      showToast(`${importedCount}건의 데이터를 복원했습니다.`, 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error('데이터 복원 오류:', err)
      showToast('파일을 읽는 중 오류가 발생했습니다. JSON 형식을 확인해주세요.', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
    <div className="settings-section">
      <h3 className="settings-section-title">📦 데이터 관리</h3>
      <button className="btn-export" onClick={handleExportData}>
        📥 내 데이터 다운로드 (JSON)
      </button>
      <p className="settings-hint">
        기록된 모든 생리주기, 증상, 관계 기록, 설정 데이터를 JSON 파일로 내보냅니다.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportData}
        style={{ display: 'none' }}
        aria-label="데이터 복원 파일 선택"
      />
      <button
        className="btn-import"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
      >
        {importing ? '복원 중...' : '📤 데이터 복원 (JSON)'}
      </button>
      <p className="settings-hint">
        이전에 내보낸 JSON 백업 파일에서 데이터를 복원합니다.
      </p>
    </div>

    {/* Migration from other apps */}
    <MigrationSection />
    </>
  )
}
