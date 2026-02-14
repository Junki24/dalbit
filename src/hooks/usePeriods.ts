import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Period, FlowIntensity } from '@/types'

export function usePeriods() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['periods', user?.id],
    queryFn: async (): Promise<Period[]> => {
      if (!user || !isSupabaseConfigured) return []
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })

      if (error) throw error
      return (data ?? []) as Period[]
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const addPeriod = useMutation({
    mutationFn: async ({
      start_date,
      end_date,
      flow_intensity,
      flow_intensities,
    }: {
      start_date: string
      end_date?: string | null
      flow_intensity?: FlowIntensity | null
      flow_intensities?: Record<string, FlowIntensity>
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('periods')
        .insert({
          user_id: user.id,
          start_date,
          end_date: end_date ?? null,
          flow_intensity: flow_intensity ?? null,
          flow_intensities: flow_intensities ?? {},
        })
        .select()
        .single()

      if (error) throw error
      return data as Period
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods', user?.id] })
    },
  })

  const updatePeriod = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Period> & { id: string }) => {
      const { data, error } = await supabase
        .from('periods')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Period
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods', user?.id] })
    },
  })

  const deletePeriod = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: 데이터를 실제로 삭제하지 않고 deleted_at 타임스탬프만 설정
      const { error } = await supabase
        .from('periods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods', user?.id] })
    },
  })

  const restorePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('periods')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Period
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods', user?.id] })
    },
  })

  return {
    periods,
    isLoading,
    addPeriod,
    updatePeriod,
    deletePeriod,
    restorePeriod,
  }
}
