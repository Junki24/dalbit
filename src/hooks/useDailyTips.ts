import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TipContent, CyclePhase } from '@/types'

/**
 * Deterministic daily tip rotation.
 * Hashes user_id + date string to pick 2-3 tips from the filtered set.
 */
function deterministicPick<T>(items: T[], seed: string, count: number): T[] {
  if (items.length === 0) return []
  if (items.length <= count) return items

  // Simple hash: sum of char codes
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  hash = Math.abs(hash)

  const picked: T[] = []
  const indices = new Set<number>()

  for (let i = 0; picked.length < count && i < count + 10; i++) {
    const idx = (hash + i * 7919) % items.length // 7919 = prime for spread
    if (!indices.has(idx)) {
      indices.add(idx)
      picked.push(items[idx])
    }
  }

  return picked
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Fetch curated daily tips based on current cycle phase.
 * Returns 2-3 tips, deterministically rotated per day per user.
 */
export function useDailyTips(currentPhase: CyclePhase | null) {
  const { user } = useAuth()

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['daily-tips', user?.id, currentPhase],
    queryFn: async (): Promise<TipContent[]> => {
      if (!user || !isSupabaseConfigured || !currentPhase) return []

      const { data, error } = await supabase
        .from('tips_content')
        .select('*')
        .eq('published', true)
        .eq('locale', 'ko')
        .in('phase', [currentPhase, 'any'])
        .order('weight', { ascending: false })

      if (error) throw error
      const allTips = (data ?? []) as TipContent[]

      // Deterministic daily pick: 2-3 tips
      const today = getTodayString()
      const seed = `${user.id}::${today}`
      return deterministicPick(allTips, seed, 3)
    },
    enabled: Boolean(user) && isSupabaseConfigured && Boolean(currentPhase),
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  return {
    tips,
    isLoading,
  }
}
