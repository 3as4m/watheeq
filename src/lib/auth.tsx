import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Membership, Profile } from './types'

interface AuthState {
  session: Session | null
  loading: boolean
  profile: Profile | null
  /** Communities the user belongs to, oldest first. */
  memberships: Membership[]
  /** Can create communities and acts as admin everywhere. */
  isPlatformAdmin: boolean
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

  const me = useQuery({
    queryKey: ['me', uid],
    enabled: !!uid,
    queryFn: async () => {
      const [p, m, a] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid!).single(),
        supabase.from('members').select('community_id, user_id, role, points, joined_at, community:communities(*)').eq('user_id', uid!).order('joined_at'),
        supabase.from('platform_admins').select('user_id').eq('user_id', uid!).maybeSingle(),
      ])
      if (p.error) throw p.error
      if (m.error) throw m.error
      return {
        profile: p.data as Profile,
        memberships: (m.data as unknown as Membership[]).filter((x) => x.community),
        isPlatformAdmin: !!a.data,
      }
    },
  })

  const value: AuthState = {
    session,
    loading: !ready || (!!uid && me.isLoading),
    profile: me.data?.profile ?? null,
    memberships: me.data?.memberships ?? [],
    isPlatformAdmin: me.data?.isPlatformAdmin ?? false,
    refresh: () => qc.invalidateQueries({ queryKey: ['me', uid] }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

/** Invite code picked up from /join/<code> before the visitor had an account. */
export const PENDING_INVITE_KEY = 'watheeq-pending-invite'
export const LAST_COMMUNITY_KEY = 'watheeq-last-community'

export function readStore(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
export function writeStore(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}
