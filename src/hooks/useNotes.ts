import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCallback } from 'react'

interface DailyNote {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

export function useNotes(date: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: noteData } = useQuery({
    queryKey: ['notes', user?.id, date],
    queryFn: async (): Promise<DailyNote | null> => {
      if (!user || !isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()

      if (error) {
        // Table might not exist yet — gracefully handle
        console.warn('daily_notes fetch error:', error.message)
        return null
      }
      return data as DailyNote | null
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const upsertNote = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !isSupabaseConfigured) return null

      if (!content.trim()) {
        // Delete note if empty
        if (noteData?.id) {
          await supabase
            .from('daily_notes')
            .delete()
            .eq('id', noteData.id)
        }
        return null
      }

      const { data, error } = await supabase
        .from('daily_notes')
        .upsert(
          {
            user_id: user.id,
            date,
            content: content.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single()

      if (error) {
        console.error('daily_notes upsert error:', error.message)
        return null
      }
      return data as DailyNote
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.id, date] })
    },
  })

  const saveNote = useCallback(
    async (content: string) => {
      await upsertNote.mutateAsync(content)
    },
    [upsertNote]
  )

  return {
    note: noteData?.content ?? null,
    isSaving: upsertNote.isPending,
    saveNote,
  }
}
