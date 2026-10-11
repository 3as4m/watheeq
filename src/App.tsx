import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Admin from './pages/Admin'
import Calendar from './pages/Calendar'
import Classroom from './pages/Classroom'
import CoursePage from './pages/CoursePage'
import Feed from './pages/Feed'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Leaderboard from './pages/Leaderboard'
import Members from './pages/Members'
import PostPage from './pages/PostPage'
import ProfilePage from './pages/ProfilePage'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } })

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="welcome" element={<Landing />} />
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="post/:id" element={<PostPage />} />
        <Route path="classroom" element={<Classroom />} />
        <Route path="classroom/:id" element={<CoursePage />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="members" element={<Members />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="u/:username" element={<ProfilePage />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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
