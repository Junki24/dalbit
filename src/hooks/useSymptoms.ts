import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Symptom, SymptomType } from '@/types'

export function useSymptoms(date?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: symptoms = [], isLoading } = useQuery({
    queryKey: ['symptoms', user?.id, date],
    queryFn: async (): Promise<Symptom[]> => {
      if (!user || !isSupabaseConfigured) return []

      let query = supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (date) {
        query = query.eq('date', date)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Symptom[]
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const addSymptom = useMutation({
    mutationFn: async ({
      date: symptomDate,
      symptom_type,
      severity,
      notes,
    }: {
      date: string
      symptom_type: SymptomType
      severity: 1 | 2 | 3 | 4 | 5
      notes?: string | null
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('symptoms')
        .insert({
          user_id: user.id,
          date: symptomDate,
          symptom_type,
          severity,
          notes: notes ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as Symptom
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms', user?.id] })
    },
  })

  const deleteSymptom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('symptoms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms', user?.id] })
    },
  })

  return {
    symptoms,
    isLoading,
    addSymptom,
    deleteSymptom,
  }
}
