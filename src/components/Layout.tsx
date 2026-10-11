import { BookOpen, CalendarDays, LogOut, MessagesSquare, Settings, Trophy, Users } from 'lucide-react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { LogoHorizontal } from './brand'
import { levelFor } from '../lib/utils'
import { Avatar } from './ui'

const nav = [
  { to: '/', label: 'المجتمع', icon: MessagesSquare, end: true },
  { to: '/classroom', label: 'المكتبة', icon: BookOpen },
  { to: '/calendar', label: 'اللقاءات', icon: CalendarDays },
  { to: '/members', label: 'الأعضاء', icon: Users },
  { to: '/leaderboard', label: 'الصدارة', icon: Trophy },
]

export default function Layout() {
  const { profile, member, isAdmin } = useAuth()
  const { pathname } = useLocation()
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-full items-center px-3 text-sm transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-mint after:transition-transform after:duration-300 after:ease-out-expo ${
      isActive ? 'font-bold text-brand after:scale-x-100' : 'font-medium text-muted after:scale-x-0 hover:text-brand hover:after:scale-x-50'}`

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="مجتمع وثيق" className="shrink-0 text-[38px]"><LogoHorizontal /></Link>
          <nav className="ms-6 hidden h-full gap-1 md:flex" aria-label="التنقل الرئيسي">
            {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
          </nav>
          <div className="ms-auto flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin" className="btn-quiet btn-icon" aria-label="إعدادات المجتمع" title="إعدادات المجتمع">
                <Settings className="size-[18px]" />
              </Link>
            )}
            <button className="btn-quiet btn-icon" onClick={() => supabase.auth.signOut()} aria-label="تسجيل الخروج" title="تسجيل الخروج">
              <LogOut className="size-[18px]" />
            </button>
            {profile && (
              <Link to={`/u/${profile.username}`} className="ms-1 rounded-full ring-2 ring-transparent transition hover:ring-mint" title="ملفي الشخصي">
                <Avatar name={profile.display_name} src={profile.avatar_url} size={36} level={levelFor(member?.points ?? 0)} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main key={pathname} className="mx-auto max-w-6xl animate-page px-4 py-8 sm:px-6"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white md:hidden" aria-label="التنقل الرئيسي">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${isActive ? 'font-bold text-brand' : 'font-medium text-muted'}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-mint" />}
                <n.icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />{n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
