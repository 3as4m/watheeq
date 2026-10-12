import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Lock, Plus, Search, Settings, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Meter, StatTile, TabBar, Th } from '../components/admin'
import { OutlineMark } from '../components/brand'
import { Avatar, Empty, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { CommunityOverview, MemberStats, PlatformUser, Role } from '../lib/types'
import { formatNumber, timeAgo } from '../lib/utils'
import { exportMembers } from './CommunitySettings'

type Tab = 'communities' | 'users'
const roleLabel: Record<Role, string> = { owner: 'مؤسس', admin: 'مدير', moderator: 'مشرف', member: 'عضو' }

function useOverview() {
  return useQuery({
    queryKey: ['platform-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('platform_overview')
      if (error) throw error
      return data as CommunityOverview[]
    },
  })
}

function useUsers() {
  return useQuery({
    queryKey: ['platform-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('platform_users', { p_search: null })
      if (error) throw error
      return data as PlatformUser[]
    },
  })
}

function CreateCommunity({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const [f, setF] = useState({ name: '', slug: '', tagline: '', about: '', is_private: true, owner: '' })
  const slugOk = /^[a-z0-9-]{2,40}$/.test(f.slug)

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_community', {
        p_slug: f.slug, p_name: f.name, p_tagline: f.tagline, p_about: f.about, p_private: f.is_private, p_owner_email: f.owner || null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: async (slug) => {
      qc.invalidateQueries({ queryKey: ['platform-overview'] }); qc.invalidateQueries({ queryKey: ['communities'] }); await refresh()
      nav(`/c/${slug}/settings?tab=settings`)
    },
  })
  const submit = (e: FormEvent) => { e.preventDefault(); if (slugOk) create.mutate() }

  return (
    <form onSubmit={submit} className="card mb-8 animate-rise overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-cloud/60 px-6 py-4">
        <h2 className="font-bold text-brand">مجتمع جديد</h2>
        <button type="button" className="btn-quiet btn-icon" aria-label="إغلاق" onClick={onClose}><X className="size-4" /></button>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div><label className="label" htmlFor="cn">اسم المجتمع</label><input id="cn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} placeholder="مثال: دفعة الرياض ٢٠٢٦" /></div>
        <div>
          <label className="label" htmlFor="cs">المعرف في الرابط</label>
          <div className="flex items-center rounded-md border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10" dir="ltr">
            <span className="ps-3 text-sm text-peri">watheaq.com/c/</span>
            <input id="cs" className="min-w-0 flex-1 bg-transparent py-2.5 pe-3 text-[15px] focus:outline-none" value={f.slug} required
              onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })} placeholder="riyadh-2026" />
          </div>
          {f.slug && !slugOk && <p className="mt-1 text-xs text-danger">حروف إنجليزية صغيرة وأرقام وشرطات فقط</p>}
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ct">الشعار النصي (اختياري)</label><input id="ct" className="input" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={120} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ca">نبذة (اختياري)</label><textarea id="ca" className="input min-h-20" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} maxLength={2000} /></div>
        <div><label className="label" htmlFor="co">بريد المؤسس (اختياري)</label><input id="co" type="email" dir="ltr" className="input text-start" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="owner@example.com" /></div>
        <label className="flex items-start gap-2.5 self-end pb-2 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[#003692]" checked={f.is_private} onChange={(e) => setF({ ...f, is_private: e.target.checked })} />
          <span><span className="font-medium text-ink">مجتمع خاص</span><span className="block text-xs text-muted">الانضمام برابط الدعوة فقط</span></span>
        </label>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-6 py-4">
        <button className="btn-primary" disabled={create.isPending || !slugOk}>{create.isPending ? 'جار الإنشاء...' : 'إنشاء المجتمع'}</button>
        <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
        <div className="flex-1"><ErrorNote error={create.error} /></div>
      </div>
    </form>
  )
}

function Communities() {
  const overview = useOverview()
  const exportOne = useMutation({
    mutationFn: async (c: CommunityOverview) => {
      const { data, error } = await supabase.rpc('member_analytics', { cid: c.id })
      if (error) throw error
      exportMembers(c.slug, data as MemberStats[])
    },
  })
  if (overview.isLoading) return <Spinner />
  if (!overview.data?.length) return <Empty title="لا توجد مجتمعات" />
  return (
    <div className="card overflow-hidden">
      <ErrorNote error={overview.error ?? exportOne.error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-line bg-cloud/60">
            <tr><Th>المجتمع</Th><Th>الأعضاء</Th><Th>نشطون 30 يومًا</Th><Th>منشورات 30 يومًا</Th><Th>دروس مكتملة</Th><Th>الاختبارات</Th><Th>الحضور</Th><Th>{''}</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {overview.data.map((c, i) => (
              <tr key={c.id} className={`animate-rise transition-colors hover:bg-cloud/50 ${c.archived ? 'opacity-60' : ''}`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <td className="px-3 py-3 ps-5">
                  <Link to={`/c/${c.slug}`} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand text-sm font-bold text-white">{c.name.trim().charAt(0)}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-bold text-brand">
                        <span className="truncate">{c.name}</span>
                        {c.is_private && <Lock className="size-3.5 shrink-0 text-peri" aria-label="خاص" />}
                        {c.archived && <span className="tag bg-cloud text-muted">مؤرشف</span>}
                      </span>
                      <span className="block text-xs text-muted" dir="ltr" style={{ textAlign: 'right' }}>/c/{c.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 font-bold text-brand tabular-nums">{formatNumber(c.members)}</td>
                <td className="px-3 py-3"><Meter value={c.active_30d} max={c.members || 1} suffix="" /></td>
                <td className="px-3 py-3 tabular-nums">{formatNumber(c.posts_30d)}</td>
                <td className="px-3 py-3 tabular-nums">{formatNumber(c.lessons_completed)}</td>
                <td className="px-3 py-3"><Meter value={c.quiz_avg} />{c.quiz_attempts > 0 && <span className="block text-[11px] text-muted">{formatNumber(c.quiz_attempts)} محاولة</span>}</td>
                <td className="px-3 py-3"><Meter value={c.attendance_rate} />{c.events_held > 0 && <span className="block text-[11px] text-muted">{formatNumber(c.events_held)} لقاء</span>}</td>
                <td className="px-3 py-3 pe-5">
                  <span className="flex justify-end gap-1">
                    <button className="btn-quiet btn-icon !p-2" title="تصدير بيانات المشاركين" aria-label={`تصدير بيانات ${c.name}`} disabled={exportOne.isPending} onClick={() => exportOne.mutate(c)}><Download className="size-4" /></button>
                    <Link to={`/c/${c.slug}/settings`} className="btn-quiet btn-icon !p-2" title="إدارة" aria-label={`إدارة ${c.name}`}><Settings className="size-4" /></Link>
                    <Link to={`/c/${c.slug}`} className="btn-quiet btn-icon !p-2" title="فتح" aria-label={`فتح ${c.name}`}><ArrowLeft className="size-4" /></Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Users() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const users = useUsers()
  const overview = useOverview()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState<{ user: PlatformUser; cid: string; role: Role } | null>(null)

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (users.data ?? []).filter((u) => !t || u.email.toLowerCase().includes(t) || u.display_name.toLowerCase().includes(t))
  }, [users.data, q])

  const reload = () => { qc.invalidateQueries({ queryKey: ['platform-users'] }); qc.invalidateQueries({ queryKey: ['platform-overview'] }) }
  const toggleAdmin = useMutation({
    mutationFn: async (u: PlatformUser) => { const { error } = await supabase.rpc('set_platform_admin', { uid: u.id, val: !u.is_platform_admin }); if (error) throw error },
    onSuccess: reload,
  })
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('add_member_by_email', { cid: adding!.cid, p_email: adding!.user.email, p_role: adding!.role })
      if (error) throw error
    },
    onSuccess: () => { setAdding(null); reload() },
  })

  if (users.isLoading) return <Spinner />
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-peri" />
          <input className="input ps-9" placeholder="ابحث بالاسم أو البريد..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في المستخدمين" />
        </div>
      </div>
      <ErrorNote error={users.error ?? toggleAdmin.error} />
      <ul className="divide-y divide-line">
        {rows.map((u) => (
          <li key={u.id} className="px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={u.display_name} src={u.avatar_url} size={38} />
              <div className="min-w-48 flex-1">
                <p className="flex items-center gap-2 font-bold text-brand">
                  {u.display_name}
                  {u.is_platform_admin && <span className="tag bg-brand text-white"><ShieldCheck className="size-3" />إدارة المنصة</span>}
                </p>
                <p className="text-xs text-muted" dir="ltr" style={{ textAlign: 'right' }}>{u.email}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {u.communities.map((c) => (
                  <Link key={c.id} to={`/c/${c.slug}`} className="tag border border-line bg-white text-brand transition-colors hover:border-brand/40">{c.name}<span className="text-peri">· {roleLabel[c.role]}</span></Link>
                ))}
                {!u.communities.length && <span className="text-xs text-peri">بدون مجتمع</span>}
              </div>
              <span className="hidden w-28 text-xs text-muted md:block">{u.last_sign_in_at ? `دخل ${timeAgo(u.last_sign_in_at)}` : 'لم يدخل بعد'}</span>
              <span className="flex gap-1">
                <button className="btn-quiet btn-icon !p-2" title="إضافة إلى مجتمع" aria-label={`إضافة ${u.display_name} إلى مجتمع`}
                  onClick={() => setAdding(adding?.user.id === u.id ? null : { user: u, cid: overview.data?.[0]?.id ?? '', role: 'member' })}><UserPlus className="size-4" /></button>
                {u.id !== session!.user.id && (
                  <button className={`btn-quiet btn-icon !p-2 ${u.is_platform_admin ? 'text-brand' : ''}`} disabled={toggleAdmin.isPending}
                    title={u.is_platform_admin ? 'إزالة صلاحية إدارة المنصة' : 'منح صلاحية إدارة المنصة'} aria-label="صلاحية إدارة المنصة"
                    onClick={() => confirm(u.is_platform_admin ? `إزالة صلاحية الإدارة من ${u.display_name}؟` : `منح ${u.display_name} صلاحية إدارة كل المجتمعات؟`) && toggleAdmin.mutate(u)}>
                    <ShieldCheck className="size-4" />
                  </button>
                )}
              </span>
            </div>
            {adding?.user.id === u.id && (
              <form className="mt-3 flex animate-rise flex-wrap items-center gap-2 rounded-md bg-cloud p-3 [animation-duration:0.3s]" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
                <select className="input !w-auto min-w-48" value={adding.cid} onChange={(e) => setAdding({ ...adding, cid: e.target.value })} aria-label="المجتمع">
                  {overview.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input !w-auto" value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value as Role })} aria-label="الدور">
                  {(['member', 'moderator', 'admin', 'owner'] as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
                <button className="btn-primary" disabled={add.isPending || !adding.cid}>إضافة</button>
                <div className="w-full"><ErrorNote error={add.error} /></div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'communities'
  const [creating, setCreating] = useState(false)
  const overview = useOverview()
  const users = useUsers()

  const o = overview.data ?? []
  const sum = (k: keyof CommunityOverview) => o.reduce((s, c) => s + (Number(c[k]) || 0), 0)
  const rates = o.map((c) => c.attendance_rate).filter((x): x is number => x !== null)
  const quizAvgs = o.filter((c) => c.quiz_avg !== null)

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded-lg bg-brand px-6 py-8 text-white sm:px-10">
        <OutlineMark className="absolute -bottom-2/3 -end-[6%] w-[48%]" color="#ffffff" opacity={0.13} />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-mint">لوحة إدارة المنصة</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">أهلًا {profile?.display_name}</h1>
            <p className="mt-2 max-w-xl text-white/70">كل المجتمعات والمشاركين في مكان واحد: أنشئ مجتمعًا، وتابع التفاعل والاختبارات والحضور، وصدّر البيانات.</p>
          </div>
          <button className="btn-light" onClick={() => setCreating(true)}><Plus className="size-4" />مجتمع جديد</button>
        </div>
      </section>

      {creating && <CreateCommunity onClose={() => setCreating(false)} />}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile index={0} accent label="المجتمعات" value={o.filter((c) => !c.archived).length} hint={o.some((c) => c.archived) ? `${o.filter((c) => c.archived).length} مؤرشف` : undefined} />
        <StatTile index={1} label="المستخدمون" value={users.data?.length ?? null} />
        <StatTile index={2} label="نشطون خلال 30 يومًا" value={sum('active_30d')} />
        <StatTile index={3} label="متوسط الاختبارات" value={quizAvgs.length ? `${Math.round(quizAvgs.reduce((s, c) => s + c.quiz_avg! * c.quiz_attempts, 0) / Math.max(1, quizAvgs.reduce((s, c) => s + c.quiz_attempts, 0)))}%` : null} hint={`${formatNumber(sum('quiz_attempts'))} محاولة`} />
        <StatTile index={4} label="متوسط الحضور" value={rates.length ? `${Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)}%` : null} hint={`${formatNumber(sum('events_held'))} لقاء`} />
      </div>

      <TabBar<Tab> value={tab} onChange={(t) => setSp(t === 'communities' ? {} : { tab: t }, { replace: true })}
        tabs={[{ id: 'communities', label: 'المجتمعات', count: o.length }, { id: 'users', label: 'المستخدمون', count: users.data?.length }]} />
      {tab === 'communities' ? <Communities /> : <Users />}
    </div>
  )
}
