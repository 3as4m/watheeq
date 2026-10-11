import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Community, Member, Profile } from './types'

interface AuthState {
  session: Session | null
  loading: boolean
  profile: Profile | null
  member: Member | null
  community: Community | null
  isStaff: boolean
  isAdmin: boolean
  refresh: () => Promise<unknown>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const uid = session?.user.id

  const community = useQuery({
    queryKey: ['community'],
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').order('created_at').limit(1).single()
      if (error) throw error
      return data as Community
    },
  })

  const me = useQuery({
    queryKey: ['me', uid],
    enabled: !!uid,
    queryFn: async () => {
      const [p, m] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid!).single(),
        supabase.from('members').select('*').eq('user_id', uid!).limit(1).maybeSingle(),
      ])
      if (p.error) throw p.error
      return { profile: p.data as Profile, member: (m.data ?? null) as Member | null }
    },
  })

  const role = me.data?.member?.role
  const value: AuthState = {
    session,
    loading: !ready || community.isLoading || (!!uid && me.isLoading),
    profile: me.data?.profile ?? null,
    member: me.data?.member ?? null,
    community: community.data ?? null,
    isStaff: role === 'owner' || role === 'admin' || role === 'moderator',
    isAdmin: role === 'owner' || role === 'admin',
    refresh: () => qc.invalidateQueries({ queryKey: ['me', uid] }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
