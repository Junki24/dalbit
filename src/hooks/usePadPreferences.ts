import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PadPreferences, ProductType, PadSize, SkinSensitivity, ComfortPriority } from '@/types'

interface SavePreferencesInput {
  product_types: ProductType[]
  brand: string | null
  product_name: string | null
  sizes: PadSize[]
  skin_sensitivity: SkinSensitivity
  priority: ComfortPriority
}

export function usePadPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['pad-preferences', user?.id],
    queryFn: async (): Promise<PadPreferences | null> => {
      if (!user || !isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from('pad_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return (data as PadPreferences) ?? null
    },
    enabled: Boolean(user) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const savePreferences = useMutation({
    mutationFn: async (input: SavePreferencesInput) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data, error } = await supabase
        .from('pad_preferences')
        .upsert({
          user_id: user.id,
          ...input,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      return data as PadPreferences
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pad-preferences', user?.id] })
    },
  })

  return {
    preferences,
    isLoading,
    savePreferences,
    hasSurvey: Boolean(preferences),
  }
}

// Partner hook: fetch owner's preferences
export function usePartnerPadPreferences(ownerId: string | null) {
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['pad-preferences', ownerId],
    queryFn: async (): Promise<PadPreferences | null> => {
      if (!ownerId || !isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from('pad_preferences')
        .select('*')
        .eq('user_id', ownerId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return (data as PadPreferences) ?? null
    },
    enabled: Boolean(ownerId) && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  return {
    preferences,
    isLoading,
    hasSurvey: Boolean(preferences),
  }
}

// Search URL builder
export function buildShoppingUrls(prefs: PadPreferences): { naver: string; coupang: string }[] {
  const results: { naver: string; coupang: string }[] = []

  for (const productType of prefs.product_types) {
    const keywords: string[] = []

    // Product type
    const typeMap: Record<ProductType, string> = {
      pad: '생리대',
      tampon: '탐폰',
      cup: '생리컵',
      liner: '팬티라이너',
    }
    keywords.push(typeMap[productType])

    // Brand
    if (prefs.brand) {
      keywords.push(prefs.brand)
    }

    // Size (pick most relevant for this product type)
    if (productType === 'pad') {
      if (prefs.sizes.includes('overnight')) keywords.push('오버나이트')
      else if (prefs.sizes.includes('large')) keywords.push('대형')
      else if (prefs.sizes.includes('medium')) keywords.push('중형')
    }

    // Skin sensitivity
    if (prefs.skin_sensitivity === 'sensitive') {
      keywords.push('순면')
    }

    // Priority
    if (prefs.priority === 'eco') keywords.push('유기농')
    else if (prefs.priority === 'cotton') keywords.push('순면')

    const query = keywords.join(' ')
    results.push({
      naver: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
      coupang: `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`,
    })
  }

  // If no product types selected, provide generic search
  if (results.length === 0) {
    const query = prefs.brand ? `${prefs.brand} 생리대` : '생리대'
    results.push({
      naver: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
      coupang: `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`,
    })
  }

  return results
}
