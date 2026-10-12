import { createContext, useCallback, useContext } from 'react'
import type { Community, Member } from './types'

export interface CommunityState {
  community: Community
  /** Null when a platform admin is looking at a community they are not a member of. */
  member: Member | null
  isStaff: boolean
  isAdmin: boolean
}

export const CommunityCtx = createContext<CommunityState | null>(null)

export function useCommunity() {
  const v = useContext(CommunityCtx)
  if (!v) throw new Error('useCommunity outside a community route')
  return v
}

/** Builds links inside the current community: to('/classroom') -> /c/<slug>/classroom */
export function useTo() {
  const { community } = useCommunity()
  return useCallback((path = '') => `/c/${community.slug}${path === '/' ? '' : path}`, [community.slug])
}
