import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Period, UserSettings, CyclePrediction } from '@/types'
import { calculateCyclePrediction, getCycleDay, getCyclePhaseInfo } from '@/lib/cycle'
import { parseISO } from 'date-fns'

interface PartnerData {
  ownerSettings: UserSettings | null
  periods: Period[]
  prediction: CyclePrediction | null
  cycleDay: number | null
  phaseInfo: ReturnType<typeof getCyclePhaseInfo> | null
}

interface PartnerLink {
  id: string
  owner_id: string
  accepted: boolean
}

export function usePartnerData() {
  const { user } = useAuth()

  // Find accepted partner sharing where current user is the partner
  const { data: partnerLink } = useQuery({
    queryKey: ['partner-link', user?.id],
    queryFn: async (): Promise<PartnerLink | null> => {
      if (!user || !isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from('partner_sharing')
        .select('id, owner_id, accepted')
        .eq('partner_user_id', user.id)
        .eq('accepted', true)
        .single()

      if (error || !data) return null
      return data as PartnerLink
    },
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  // Fetch partner's data if linked
  const { data: partnerData, isLoading } = useQuery({
    queryKey: ['partner-data', partnerLink?.owner_id],
    queryFn: async (): Promise<PartnerData> => {
      if (!partnerLink) throw new Error('Partner link not found')
      const ownerId = partnerLink.owner_id

      // Fetch owner settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', ownerId)
        .single()

      // Fetch owner periods
      const { data: periods } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', ownerId)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })

      const periodList = (periods ?? []) as Period[]
      const prediction = calculateCyclePrediction(periodList)

      let cycleDay: number | null = null
      let phaseInfo: ReturnType<typeof getCyclePhaseInfo> | null = null

      if (periodList.length > 0) {
        const sorted = [...periodList].sort(
          (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
        )
        const lastPeriodDate = parseISO(sorted[0].start_date)
        cycleDay = getCycleDay(lastPeriodDate)
        const avgCycleLength = prediction?.averageCycleLength ?? 28
        phaseInfo = getCyclePhaseInfo(cycleDay, avgCycleLength)
      }

      return {
        ownerSettings: (settings as UserSettings) ?? null,
        periods: periodList,
        prediction,
        cycleDay,
        phaseInfo,
      }
    },
    enabled: Boolean(partnerLink?.owner_id),
    staleTime: 5 * 60 * 1000,
  })

  return {
    isLinked: Boolean(partnerLink),
    isLoading,
    partnerName: partnerData?.ownerSettings?.display_name ?? null,
    partnerData: partnerData ?? null,
  }
}
