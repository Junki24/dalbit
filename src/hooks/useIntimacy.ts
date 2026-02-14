import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { IntimacyRecord, TimeOfDay, ProtectionMethod } from '@/types'

/** Single-date intimacy records (for RecordPage) */
export function useIntimacy(date?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['intimacy', user?.id, date],
    queryFn: async (): Promise<IntimacyRecord[]> => {
      if (!user || !isSupabaseConfigured) return []

      let query = supabase
        .from('intimacy_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (date) {
        query = query.eq('date', date)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as IntimacyRecord[]
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const addRecord = useMutation({
    mutationFn: async (input: {
      date: string
      time_of_day?: TimeOfDay | null
      protection_used?: boolean | null
      protection_method?: ProtectionMethod | null
      note?: string | null
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('intimacy_records')
        .insert({
          user_id: user.id,
          date: input.date,
          time_of_day: input.time_of_day ?? null,
          protection_used: input.protection_used ?? null,
          protection_method: input.protection_used ? (input.protection_method ?? null) : null,
          note: input.note ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as IntimacyRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intimacy', user?.id] })
    },
  })

  const updateRecord = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      time_of_day?: TimeOfDay | null
      protection_used?: boolean | null
      protection_method?: ProtectionMethod | null
      note?: string | null
    }) => {
      const { data, error } = await supabase
        .from('intimacy_records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as IntimacyRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intimacy', user?.id] })
    },
  })

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('intimacy_records').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intimacy', user?.id] })
    },
  })

  return {
    records,
    isLoading,
    addRecord,
    updateRecord,
    deleteRecord,
  }
}

/** Range-based query for calendar / stats */
export function useIntimacyRange(startDate?: string, endDate?: string) {
  const { user } = useAuth()

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['intimacy-range', user?.id, startDate, endDate],
    queryFn: async (): Promise<IntimacyRecord[]> => {
      if (!user || !isSupabaseConfigured || !startDate || !endDate) return []

      const { data, error } = await supabase
        .from('intimacy_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error
      return (data ?? []) as IntimacyRecord[]
    },
    enabled: Boolean(user) && isSupabaseConfigured && Boolean(startDate) && Boolean(endDate),
    staleTime: 5 * 60 * 1000,
  })

  return { records, isLoading }
}
