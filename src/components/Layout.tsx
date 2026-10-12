import { BookOpen, CalendarDays, Check, ChevronDown, LayoutDashboard, LayoutGrid, LogOut, MessagesSquare, Settings, Trophy, Users } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { supabase } from '../lib/supabase'
import { levelFor } from '../lib/utils'
import { LogoHorizontal, Mark } from './brand'
import { Avatar } from './ui'

/** Dropdown listing the viewer's communities; the current one is checked. */
function Switcher({ current }: { current?: { id: string; name: string } }) {
  const { memberships, isPlatformAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <div ref={ref} className="relative min-w-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        className="flex max-w-56 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-bold text-brand transition-colors hover:bg-brand-soft">
        <span className="truncate">{current?.name ?? 'مجتمعاتي'}</span>
        <ChevronDown className={`size-4 shrink-0 text-peri transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute start-0 top-full z-30 mt-2 w-72 animate-rise overflow-hidden rounded-lg border border-line bg-white [animation-duration:0.3s]">
          <p className="border-b border-line px-4 py-2.5 text-xs font-semibold text-peri">مجتمعاتك</p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {memberships.map((m) => (
              <li key={m.community_id}>
                <Link role="menuitem" to={`/c/${m.community.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-cloud">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-xs font-bold text-white">{m.community.name.trim().charAt(0)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-brand">{m.community.name}</span>
                  {current?.id === m.community_id && <Check className="size-4 text-mint-deep" />}
                </Link>
              </li>
            ))}
            {memberships.length === 0 && <li className="px-4 py-3 text-sm text-muted">لم تنضم إلى أي مجتمع بعد.</li>}
          </ul>
          <div className="border-t border-line p-1.5">
            <Link role="menuitem" to="/communities" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-cloud hover:text-brand">
              <LayoutGrid className="size-4" />كل المجتمعات
            </Link>
            {isPlatformAdmin && (
              <Link role="menuitem" to="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-cloud hover:text-brand">
                <LayoutDashboard className="size-4" />لوحة الإدارة
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ community, points, profileHref, children, actions }: {
  community?: { id: string; name: string }; points?: number; profileHref?: string; children?: ReactNode; actions?: ReactNode
}) {
  const { profile, isPlatformAdmin } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/communities" aria-label="مجتمع وثيق" className="shrink-0">
          <span className="hidden text-[38px] lg:inline-flex"><LogoHorizontal /></span>
          <Mark className="h-9 w-auto lg:hidden" />
        </Link>
        <span className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />
        <Switcher current={community} />
        {children}
        <div className="ms-auto flex shrink-0 items-center gap-1">
          {actions}
          {isPlatformAdmin && (
            <Link to="/admin" className="btn-quiet btn-icon" aria-label="لوحة الإدارة" title="لوحة الإدارة"><LayoutDashboard className="size-[18px]" /></Link>
          )}
          <button className="btn-quiet btn-icon" onClick={() => supabase.auth.signOut()} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut className="size-[18px]" />
          </button>
          {profile && (profileHref ? (
            <Link to={profileHref} className="ms-1 rounded-full ring-2 ring-transparent transition hover:ring-mint" title="ملفي الشخصي">
              <Avatar name={profile.display_name} src={profile.avatar_url} size={36} level={points !== undefined ? levelFor(points) : undefined} />
            </Link>
          ) : (
            <span className="ms-1" title={profile.display_name}><Avatar name={profile.display_name} src={profile.avatar_url} size={36} /></span>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Frame for pages outside a community: the hub and the platform dashboard. */
export function PlainLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh">
      <Header />
      <main key={pathname} className="mx-auto max-w-6xl animate-page px-4 py-8 sm:px-6"><Outlet /></main>
    </div>
  )
}

export default function Layout() {
  const { community, member, isAdmin } = useCommunity()
  const { profile } = useAuth()
  const to = useTo()
  const { pathname } = useLocation()
  const nav = [
    { to: to('/'), label: 'المجتمع', icon: MessagesSquare, end: true },
    { to: to('/classroom'), label: 'المكتبة', icon: BookOpen },
    { to: to('/calendar'), label: 'اللقاءات', icon: CalendarDays },
    { to: to('/members'), label: 'الأعضاء', icon: Users },
    { to: to('/leaderboard'), label: 'الصدارة', icon: Trophy },
  ]
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-full items-center px-3 text-sm transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-mint after:transition-transform after:duration-300 after:ease-out-expo ${
      isActive ? 'font-bold text-brand after:scale-x-100' : 'font-medium text-muted after:scale-x-0 hover:text-brand hover:after:scale-x-50'}`

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <Header community={community} points={member?.points ?? 0} profileHref={profile ? to(`/u/${profile.username}`) : undefined}
        actions={isAdmin && (
          <Link to={to('/settings')} className="btn-quiet btn-icon" aria-label="إدارة المجتمع" title="إدارة المجتمع"><Settings className="size-[18px]" /></Link>
        )}>
        <nav className="ms-2 hidden h-full gap-1 md:flex" aria-label="التنقل الرئيسي">
          {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
        </nav>
      </Header>

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
