import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardApp from '@/components/dashboard-app'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { fetchWindowedSurebets, periodSinceIso } from '@/lib/surebets-window'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Only load the last 7 days by default (plus any still-pending bet
  // regardless of age) to keep the initial page load light as history grows.
  const { data: initialSurebetsData } = await fetchWindowedSurebets(supabase, {
    isAdmin,
    userId: user.id,
    sinceIso: periodSinceIso('week'),
  })
  const initialSurebets: SurebetWithLegs[] = initialSurebetsData

  const { data: accountsData } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
  const initialAccounts = (accountsData as unknown as Account[]) || []

  let initialUsernames: Record<string, string> = {}
  let initialProfiles: Profile[] = []
  if (isAdmin) {
    const { data: profilesData } = await supabase.from('profiles').select('*')
    if (profilesData) {
      initialProfiles = profilesData
      initialUsernames = Object.fromEntries(
        profilesData.map((p: { id: string; username: string }) => [p.id, p.username])
      )
    }
  }

  return (
    <DashboardApp
      initialProfile={profile}
      initialSurebets={initialSurebets}
      initialUsernames={initialUsernames}
      initialProfiles={initialProfiles}
      initialAccounts={initialAccounts}
    />
  )
}
