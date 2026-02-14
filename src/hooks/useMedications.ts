import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Medication, MedicationIntake, MedicationType } from '@/types'

// ── Medication CRUD ──

export function useMedications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications', user?.id],
    queryFn: async (): Promise<Medication[]> => {
      if (!user || !isSupabaseConfigured) return []
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Medication[]
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const addMedication = useMutation({
    mutationFn: async (input: {
      name: string
      type: MedicationType
      form?: string | null
      strength?: string | null
      hospital?: string | null
      doctor?: string | null
      prescribed_date?: string | null
      prescription_notes?: string | null
      prescription_days?: number | null
      notes?: string | null
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type,
          form: input.form ?? null,
          strength: input.strength ?? null,
          hospital: input.hospital ?? null,
          doctor: input.doctor ?? null,
          prescribed_date: input.prescribed_date ?? null,
          prescription_notes: input.prescription_notes ?? null,
          prescription_days: input.prescription_days ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as Medication
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', user?.id] })
    },
  })

  const updateMedication = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Medication> & { id: string }) => {
      const { data, error } = await supabase
        .from('medications')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Medication
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', user?.id] })
    },
  })

  const deleteMedication = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set is_active = false
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', user?.id] })
    },
  })

  return {
    medications,
    isLoading,
    addMedication,
    updateMedication,
    deleteMedication,
  }
}

// ── Medication Intake (date-filtered) ──

export function useMedicationIntakes(date?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['medication-intakes', user?.id, date],
    queryFn: async (): Promise<MedicationIntake[]> => {
      if (!user || !isSupabaseConfigured) return []

      let query = supabase
        .from('medication_intakes')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })

      if (date) {
        // Filter by date in KST (UTC+9)
        query = query.gte('taken_at', `${date}T00:00:00+09:00`)
          .lt('taken_at', `${date}T23:59:59.999+09:00`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as MedicationIntake[]
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const addIntake = useMutation({
    mutationFn: async (input: {
      medication_id?: string | null
      medication_name: string
      taken_at?: string
      dosage?: string | null
      note?: string | null
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('medication_intakes')
        .insert({
          user_id: user.id,
          medication_id: input.medication_id ?? null,
          medication_name: input.medication_name,
          taken_at: input.taken_at ?? new Date().toISOString(),
          dosage: input.dosage ?? null,
          note: input.note ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as MedicationIntake
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-intakes', user?.id] })
    },
  })

  const deleteIntake = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medication_intakes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-intakes', user?.id] })
    },
  })

  return {
    intakes,
    isLoading,
    addIntake,
    deleteIntake,
  }
}
