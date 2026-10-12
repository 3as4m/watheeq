import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout, { PlainLayout } from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider, LAST_COMMUNITY_KEY, PENDING_INVITE_KEY, readStore, useAuth, writeStore } from './lib/auth'
import { CommunityCtx, type CommunityState } from './lib/community'
import { supabase } from './lib/supabase'
import type { Community } from './lib/types'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Classroom from './pages/Classroom'
import CommunitySettings from './pages/CommunitySettings'
import CoursePage from './pages/CoursePage'
import Dashboard from './pages/Dashboard'
import EventPage from './pages/EventPage'
import Feed from './pages/Feed'
import Hub from './pages/Hub'
import Join, { JoinPrompt } from './pages/Join'
import Landing from './pages/Landing'
import Leaderboard from './pages/Leaderboard'
import Members from './pages/Members'
import PostPage from './pages/PostPage'
import ProfilePage from './pages/ProfilePage'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } })

/** Signed-in home: finish a pending invite, else reopen the last community, else show the hub. */
function Home() {
  const { memberships } = useAuth()
  const invite = readStore(PENDING_INVITE_KEY)
  if (invite) return <Navigate to={`/join/${invite}`} replace />
  const last = readStore(LAST_COMMUNITY_KEY)
  const target = memberships.find((m) => m.community.slug === last) ?? (memberships.length === 1 ? memberships[0] : undefined)
  if (target) return <Navigate to={`/c/${target.community.slug}`} replace />
  return <Navigate to="/communities" replace />
}

/** Resolves /c/:slug to a community and the viewer's role in it, then renders the community shell. */
function CommunityRoute() {
  const { slug = '' } = useParams()
  const { memberships, isPlatformAdmin } = useAuth()
  const mine = memberships.find((m) => m.community.slug === slug)

  const other = useQuery({
    queryKey: ['community', slug],
    enabled: !mine,
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').eq('slug', slug).maybeSingle()
      if (error) throw error
      return data as Community | null
    },
  })

  useEffect(() => { if (mine) writeStore(LAST_COMMUNITY_KEY, slug) }, [mine, slug])

  const community = mine?.community ?? other.data
  if (!mine && other.isLoading) return <Spinner />
  if (!community) return <Navigate to="/communities" replace />
  if (!mine && !isPlatformAdmin) return <JoinPrompt community={community} />

  const role = mine?.role
  const value: CommunityState = {
    community,
    member: mine ?? null,
    isStaff: isPlatformAdmin || role === 'owner' || role === 'admin' || role === 'moderator',
    isAdmin: isPlatformAdmin || role === 'owner' || role === 'admin',
  }
  return <CommunityCtx.Provider value={value}><Layout /></CommunityCtx.Provider>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin } = useAuth()
  return isPlatformAdmin ? children : <Navigate to="/" replace />
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) {
    return (
      <Routes>
        <Route index element={<Landing />} />
        <Route path="welcome" element={<Landing />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="signup" element={<Auth mode="signup" />} />
        <Route path="join/:code" element={<Join />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="welcome" element={<Landing />} />
      <Route path="join/:code" element={<Join />} />
      <Route element={<PlainLayout />}>
        <Route path="communities" element={<Hub />} />
        <Route path="admin" element={<AdminOnly><Dashboard /></AdminOnly>} />
      </Route>
      <Route path="c/:slug" element={<CommunityRoute />}>
        <Route index element={<Feed />} />
        <Route path="post/:id" element={<PostPage />} />
        <Route path="classroom" element={<Classroom />} />
        <Route path="classroom/:id" element={<CoursePage />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="calendar/:id" element={<EventPage />} />
        <Route path="members" element={<Members />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="u/:username" element={<ProfilePage />} />
        <Route path="settings" element={<CommunitySettings />} />
        <Route path="*" element={<Navigate to=".." replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
