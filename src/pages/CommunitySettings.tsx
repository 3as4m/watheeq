import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, ChevronDown, Copy, Download, Link2, Plus, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Meter, StatTile, TabBar, Th } from '../components/admin'
import { useCategories } from '../components/Composer'
import { Avatar, Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { downloadCsv } from '../lib/csv'
import { ATTENDANCE_LABEL } from '../lib/events'
import { supabase } from '../lib/supabase'
import type { AttendanceStatus, MemberStats, QuestionKind, Role } from '../lib/types'
import { formatNumber, timeAgo } from '../lib/utils'

type Tab = 'people' | 'quizzes' | 'attendance' | 'settings'
const roleLabel: Record<Role, string> = { owner: 'مؤسس', admin: 'مدير', moderator: 'مشرف', member: 'عضو' }

export function useMemberStats(cid: string) {
  return useQuery({
    queryKey: ['analytics', cid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('member_analytics', { cid })
      if (error) throw error
      return data as MemberStats[]
    },
  })
}

export function exportMembers(name: string, rows: MemberStats[]) {
  downloadCsv(`${name}-participants.csv`,
    ['الاسم', 'البريد', 'الدور', 'النقاط', 'المستوى', 'تاريخ الانضمام', 'آخر نشاط', 'المنشورات', 'التعليقات', 'الدروس المكتملة', 'إجمالي الدروس',
      'محاولات الاختبارات', 'اختبارات ناجحة', 'متوسط الاختبارات %', 'لقاءات حضرها', 'لقاءات منذ انضمامه', 'نسبة الحضور %'],
    rows.map((r) => [r.display_name, r.email, roleLabel[r.role], r.points, r.level, r.joined_at.slice(0, 10), r.last_active_at?.slice(0, 10), r.posts, r.comments,
      r.lessons_completed, r.lessons_total, r.quiz_attempts, r.quizzes_passed, r.quiz_avg, r.events_attended, r.events_held, r.attendance_rate]))
}

// ---------------------------------------------------------------- participants
type SortKey = 'points' | 'last_active_at' | 'lessons_completed' | 'quiz_avg' | 'attendance_rate' | 'joined_at'

function People() {
  const { community } = useCommunity()
  const to = useTo()
  const stats = useMemberStats(community.id)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'points', dir: 'desc' })

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (stats.data ?? []).filter((r) => !term || r.display_name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term))
    const val = (r: MemberStats) => { const v = r[sort.key]; return v === null ? -1 : typeof v === 'string' ? new Date(v).getTime() : v }
    return [...list].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (val(a) - val(b)))
  }, [stats.data, q, sort])

  const all = stats.data ?? []
  const active = all.filter((r) => r.last_active_at && Date.now() - new Date(r.last_active_at).getTime() < 30 * 86400_000).length
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null }
  const head = (key: SortKey, label: string) => (
    <Th onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))} active={sort.key === key} dir={sort.key === key ? sort.dir : 'desc'}>{label}</Th>
  )

  if (stats.isLoading) return <Spinner />
  return (
    <div className="space-y-6">
      <ErrorNote error={stats.error} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} accent label="المشاركون" value={all.length} />
        <StatTile index={1} label="نشطون خلال 30 يومًا" value={active} hint={all.length ? `${Math.round((active / all.length) * 100)}% من الأعضاء` : undefined} />
        <StatTile index={2} label="متوسط الاختبارات" value={avg(all.map((r) => r.quiz_avg)) === null ? null : `${avg(all.map((r) => r.quiz_avg))}%`} />
        <StatTile index={3} label="متوسط الحضور" value={avg(all.map((r) => r.attendance_rate)) === null ? null : `${avg(all.map((r) => r.attendance_rate))}%`} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-peri" />
            <input className="input ps-9" placeholder="ابحث بالاسم أو البريد..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في المشاركين" />
          </div>
          <button className="btn-ghost" onClick={() => exportMembers(community.slug, rows)}><Download className="size-4" />تصدير CSV</button>
        </div>
        {!rows.length ? <div className="p-6"><Empty title="لا يوجد مشاركون" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-line bg-cloud/60">
                <tr>
                  <Th>المشارك</Th>
                  {head('points', 'النقاط')}
                  {head('last_active_at', 'آخر نشاط')}
                  <Th>مشاركات</Th>
                  {head('lessons_completed', 'الدروس')}
                  {head('quiz_avg', 'الاختبارات')}
                  {head('attendance_rate', 'الحضور')}
                  {head('joined_at', 'انضم')}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.user_id} className="transition-colors hover:bg-cloud/50">
                    <td className="px-3 py-3 ps-5">
                      <Link to={to(`/u/${r.username}`)} className="flex items-center gap-3">
                        <Avatar name={r.display_name} src={r.avatar_url} size={34} level={r.level} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-brand">{r.display_name}{r.role !== 'member' && <span className="tag ms-2 bg-brand-soft text-brand">{roleLabel[r.role]}</span>}</span>
                          <span className="block truncate text-xs text-muted" dir="ltr" style={{ textAlign: 'right' }}>{r.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-bold text-brand tabular-nums">{formatNumber(r.points)}</td>
                    <td className="px-3 py-3 text-muted">{r.last_active_at ? timeAgo(r.last_active_at) : '—'}</td>
                    <td className="px-3 py-3 text-muted tabular-nums">{formatNumber(r.posts)} منشور · {formatNumber(r.comments)} تعليق</td>
                    <td className="px-3 py-3"><Meter value={r.lessons_completed} max={r.lessons_total} suffix="" /></td>
                    <td className="px-3 py-3">
                      <Meter value={r.quiz_avg} />
                      {r.quiz_attempts > 0 && <span className="block text-[11px] text-muted">{formatNumber(r.quizzes_passed)} ناجح · {formatNumber(r.quiz_attempts)} محاولة</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Meter value={r.attendance_rate} />
                      {r.events_held > 0 && <span className="block text-[11px] text-muted">{formatNumber(r.events_attended)} من {formatNumber(r.events_held)}</span>}
                    </td>
                    <td className="px-3 py-3 pe-5 text-xs text-muted">{new Date(r.joined_at).toLocaleDateString('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- quiz results
interface QuizReport {
  id: string; title: string; pass_score: number; published: boolean
  lesson: { id: string; title: string; module: { course: { id: string; title: string } } } | null
  quiz_questions: { id: string; prompt: string; kind: QuestionKind; position: number }[]
  quiz_attempts: { user_id: string; score: number; passed: boolean; created_at: string; answers: Record<string, string[] | string> }[]
}

function Quizzes() {
  const { community } = useCommunity()
  const to = useTo()
  const stats = useMemberStats(community.id)
  const [open, setOpen] = useState<string | null>(null)
  const names = new Map((stats.data ?? []).map((m) => [m.user_id, m]))

  const reports = useQuery({
    queryKey: ['quiz-reports', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('quizzes')
        .select('id, title, pass_score, published, lesson:lessons(id, title, module:modules(course:courses(id, title))), quiz_questions(id, prompt, kind, position), quiz_attempts(user_id, score, passed, created_at, answers)')
        .eq('community_id', community.id).order('created_at')
      if (error) throw error
      return data as unknown as QuizReport[]
    },
  })

  if (reports.isLoading) return <Spinner />
  if (!reports.data?.length) return <Empty title="لا توجد اختبارات بعد" hint="أضف اختبارًا من صفحة أي درس في المكتبة." />

  return (
    <div className="space-y-3">
      <ErrorNote error={reports.error} />
      {reports.data.map((z, i) => {
        // best attempt per member
        const best = new Map<string, QuizReport['quiz_attempts'][number]>()
        z.quiz_attempts.forEach((a) => { const b = best.get(a.user_id); if (!b || a.score > b.score) best.set(a.user_id, a) })
        const latest = new Map<string, QuizReport['quiz_attempts'][number]>()
        z.quiz_attempts.forEach((a) => { const b = latest.get(a.user_id); if (!b || a.created_at > b.created_at) latest.set(a.user_id, a) })
        const takers = [...best.values()]
        const avg = takers.length ? Math.round(takers.reduce((s, a) => s + a.score, 0) / takers.length) : null
        const passRate = takers.length ? Math.round((takers.filter((a) => a.passed).length / takers.length) * 100) : null
        const textQs = z.quiz_questions.filter((x) => x.kind === 'text').sort((a, b) => a.position - b.position)
        const isOpen = open === z.id
        return (
          <div key={z.id} className="card animate-rise overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
            <button onClick={() => setOpen(isOpen ? null : z.id)} aria-expanded={isOpen}
              className="flex w-full cursor-pointer flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-start transition-colors hover:bg-cloud/50">
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-peri">{z.lesson?.module.course.title} · {z.lesson?.title}</span>
                <span className="block font-bold text-brand">{z.title}{!z.published && <span className="tag ms-2 bg-cloud text-muted">مخفي</span>}</span>
              </span>
              <span className="text-center"><span className="block text-xs text-muted">المشاركون</span><span className="font-bold text-brand tabular-nums">{formatNumber(takers.length)}</span></span>
              <span className="text-center"><span className="block text-xs text-muted">متوسط أفضل نتيجة</span><span className="font-bold text-brand tabular-nums">{avg === null ? '—' : `${avg}%`}</span></span>
              <span className="text-center"><span className="block text-xs text-muted">نسبة النجاح</span><span className="font-bold text-mint-deep tabular-nums">{passRate === null ? '—' : `${passRate}%`}</span></span>
              <ChevronDown className={`size-4 text-peri transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="animate-rise border-t border-line [animation-duration:0.35s]">
                {!takers.length ? <p className="px-5 py-4 text-sm text-muted">لم يحل أحد هذا الاختبار بعد.</p> : (
                  <ul className="divide-y divide-line">
                    {takers.sort((a, b) => b.score - a.score).map((a) => {
                      const m = names.get(a.user_id)
                      const last = latest.get(a.user_id)!
                      return (
                        <li key={a.user_id} className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={m?.display_name ?? '؟'} src={m?.avatar_url} size={30} />
                            {m ? <Link to={to(`/u/${m.username}`)} className="min-w-0 flex-1 truncate text-sm font-bold text-brand hover:underline">{m.display_name}</Link>
                              : <span className="flex-1 text-sm text-muted">عضو سابق</span>}
                            <span className={`tag ${a.passed ? 'bg-mint-soft text-mint-deep' : 'bg-danger/10 text-danger'}`}>{a.passed ? 'ناجح' : 'لم ينجح'}</span>
                            <span className="w-12 text-end font-bold text-brand tabular-nums">{a.score}%</span>
                            <span className="hidden w-24 text-end text-xs text-muted sm:block">{timeAgo(last.created_at)}</span>
                          </div>
                          {textQs.map((tq) => {
                            const ans = last.answers[tq.id]
                            return typeof ans === 'string' && ans.trim() ? (
                              <div key={tq.id} className="ms-11 mt-2 border-s-4 border-mint bg-mint-soft/40 px-3 py-2">
                                <p className="text-xs font-semibold text-peri">{tq.prompt}</p>
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/85">{ans}</p>
                              </div>
                            ) : null
                          })}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {z.lesson && (
                  <div className="border-t border-line bg-cloud/60 px-5 py-3 text-sm">
                    <Link to={to(`/classroom/${z.lesson.module.course.id}?lesson=${z.lesson.id}`)} className="font-semibold text-brand hover:underline">فتح الدرس وتعديل الاختبار</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- attendance overview
function AttendanceTab() {
  const { community } = useCommunity()
  const to = useTo()
  const stats = useMemberStats(community.id)
  const events = useQuery({
    queryKey: ['events', community.id, 'report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('id, title, starts_at, event_rsvps(user_id), event_attendance(status)')
        .eq('community_id', community.id).lt('starts_at', new Date().toISOString()).order('starts_at', { ascending: false })
      if (error) throw error
      return data as unknown as { id: string; title: string; starts_at: string; event_rsvps: { user_id: string }[]; event_attendance: { status: AttendanceStatus }[] }[]
    },
  })
  if (events.isLoading) return <Spinner />
  if (!events.data?.length) return <Empty title="لا توجد لقاءات سابقة" hint="يظهر هنا سجل الحضور بعد انعقاد اللقاءات." />
  const members = stats.data?.length ?? 0
  return (
    <div className="card overflow-hidden">
      <ErrorNote error={events.error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-cloud/60">
            <tr><Th>اللقاء</Th><Th>سجلوا</Th>{(['present', 'late', 'absent', 'excused'] as const).map((s) => <Th key={s}>{ATTENDANCE_LABEL[s]}</Th>)}<Th>نسبة الحضور</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.data.map((e) => {
              const n = (s: AttendanceStatus) => e.event_attendance.filter((a) => a.status === s).length
              const came = n('present') + n('late')
              return (
                <tr key={e.id} className="transition-colors hover:bg-cloud/50">
                  <td className="px-3 py-3 ps-5">
                    <Link to={to(`/calendar/${e.id}`)} className="font-bold text-brand hover:underline">{e.title}</Link>
                    <span className="block text-xs text-muted">{new Date(e.starts_at).toLocaleDateString('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{formatNumber(e.event_rsvps.length)}</td>
                  {(['present', 'late', 'absent', 'excused'] as const).map((s) => <td key={s} className="px-3 py-3 tabular-nums">{formatNumber(n(s))}</td>)}
                  <td className="px-3 py-3 pe-5"><Meter value={members ? Math.round((came / members) * 100) : null} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- settings
function SettingsTab() {
  const { community, isAdmin } = useCommunity()
  const { isPlatformAdmin, refresh } = useAuth()
  const qc = useQueryClient()
  const nav = useNavigate()
  const cats = useCategories()
  const [f, setF] = useState({ name: community.name, tagline: community.tagline ?? '', about: community.about ?? '', is_private: community.is_private })
  const [saved, setSaved] = useState(false)
  const [catName, setCatName] = useState('')
  const [invite, setInvite] = useState({ email: '', role: 'member' as Role })
  const [copied, setCopied] = useState(false)
  const reload = () => { refresh(); qc.invalidateQueries({ queryKey: ['community'] }); qc.invalidateQueries({ queryKey: ['communities'] }) }

  const code = useQuery({
    queryKey: ['invite-code', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('community_invites').select('code').eq('community_id', community.id).maybeSingle()
      if (error) throw error
      return data?.code as string | undefined
    },
  })
  const link = code.data ? `${window.location.origin}/join/${code.data}` : ''

  const saveInfo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('communities').update({ name: f.name.trim(), tagline: f.tagline.trim() || null, about: f.about.trim() || null, is_private: f.is_private }).eq('id', community.id)
      if (error) throw error
    },
    onSuccess: () => { setSaved(true); reload() },
  })
  const regen = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('regenerate_invite', { cid: community.id }); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite-code', community.id] }),
  })
  const addMember = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('add_member_by_email', { cid: community.id, p_email: invite.email, p_role: invite.role }); if (error) throw error },
    onSuccess: () => { setInvite({ email: '', role: 'member' }); qc.invalidateQueries({ queryKey: ['analytics', community.id] }); qc.invalidateQueries({ queryKey: ['members', community.id] }) },
  })
  const addCat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert({ community_id: community.id, name: catName.trim(), position: cats.data?.length ?? 0 })
      if (error) throw error
    },
    onSuccess: () => { setCatName(''); qc.invalidateQueries({ queryKey: ['categories'] }) },
  })
  const delCat = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
  const archive = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('communities').update({ archived: !community.archived }).eq('id', community.id); if (error) throw error },
    onSuccess: reload,
  })
  const destroy = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('communities').delete().eq('id', community.id); if (error) throw error },
    onSuccess: async () => { await refresh(); nav('/admin') },
  })

  if (!isAdmin) return null
  const submit = (e: FormEvent) => { e.preventDefault(); setSaved(false); saveInfo.mutate() }
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="card space-y-3 p-5 sm:p-6">
        <h2 className="font-bold text-brand">معلومات المجتمع</h2>
        <div><label className="label" htmlFor="an">الاسم</label><input id="an" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} /></div>
        <div><label className="label" htmlFor="at">الشعار النصي</label><input id="at" className="input" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={120} /></div>
        <div><label className="label" htmlFor="aa">عن المجتمع</label><textarea id="aa" className="input min-h-28" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} maxLength={2000} /></div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[#003692]" checked={f.is_private} onChange={(e) => setF({ ...f, is_private: e.target.checked })} />
          <span><span className="font-medium text-ink">مجتمع خاص</span><span className="block text-xs text-muted">لا يظهر في الدليل، والانضمام برابط الدعوة أو بإضافة الإدارة فقط.</span></span>
        </label>
        <ErrorNote error={saveInfo.error} />
        {saved && <p role="status" className="animate-rise text-sm font-medium text-mint-deep">تم الحفظ.</p>}
        <button className="btn-primary" disabled={saveInfo.isPending}>حفظ</button>
      </form>

      <div className="space-y-6">
        <section className="card space-y-3 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold text-brand"><Link2 className="size-4" />رابط الدعوة</h2>
          <p className="text-sm text-muted">من يفتح هذا الرابط ينضم مباشرة، حتى لو كان المجتمع خاصًا.</p>
          <div className="flex gap-2">
            <input readOnly className="input text-start text-sm" dir="ltr" value={link} aria-label="رابط الدعوة" onFocus={(e) => e.target.select()} />
            <button className="btn-primary shrink-0" onClick={copy} disabled={!link}><Copy className="size-4" />{copied ? 'تم النسخ' : 'نسخ'}</button>
          </div>
          <button className="btn-quiet text-xs" disabled={regen.isPending} onClick={() => confirm('سيتوقف الرابط الحالي عن العمل. متابعة؟') && regen.mutate()}><RefreshCw className="size-3.5" />رابط جديد</button>
          <ErrorNote error={code.error ?? regen.error} />
        </section>

        <form className="card space-y-3 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); addMember.mutate() }}>
          <h2 className="flex items-center gap-2 font-bold text-brand"><UserPlus className="size-4" />إضافة عضو بالبريد</h2>
          <p className="text-sm text-muted">لأصحاب الحسابات المسجلة. يمكنك أيضًا تغيير دور عضو موجود من هنا.</p>
          <div className="flex flex-wrap gap-2">
            <input type="email" dir="ltr" className="input min-w-0 flex-1 text-start" placeholder="name@example.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required aria-label="البريد الإلكتروني" />
            <select className="input !w-auto" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })} aria-label="الدور">
              <option value="member">عضو</option><option value="moderator">مشرف</option><option value="admin">مدير</option>
              {isPlatformAdmin && <option value="owner">مؤسس</option>}
            </select>
            <button className="btn-primary" disabled={addMember.isPending}>إضافة</button>
          </div>
          <ErrorNote error={addMember.error} />
          {addMember.isSuccess && <p role="status" className="text-sm font-medium text-mint-deep">تمت الإضافة.</p>}
        </form>

        <section className="card space-y-3 p-5 sm:p-6">
          <h2 className="font-bold text-brand">تصنيفات المنشورات</h2>
          <ErrorNote error={addCat.error ?? delCat.error} />
          <ul className="divide-y divide-line">
            {cats.data?.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="h-4 w-[3px] rounded-full bg-mint" aria-hidden="true" />
                <span className="flex-1">{c.name}</span>
                <button className="btn-danger !p-2" aria-label={`حذف ${c.name}`} onClick={() => confirm('حذف التصنيف؟ تبقى المنشورات بدون تصنيف.') && delCat.mutate(c.id)}><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (catName.trim()) addCat.mutate() }}>
            <input className="input" placeholder="تصنيف جديد" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={40} aria-label="اسم التصنيف" />
            <button className="btn-primary btn-icon" disabled={addCat.isPending} aria-label="إضافة تصنيف"><Plus className="size-4" /></button>
          </form>
        </section>

        <section className="card space-y-3 border-danger/30 p-5 sm:p-6">
          <h2 className="font-bold text-danger">منطقة الخطر</h2>
          <button className="btn-ghost w-full justify-start" disabled={archive.isPending} onClick={() => archive.mutate()}>
            {community.archived ? <><ArchiveRestore className="size-4" />إلغاء الأرشفة</> : <><Archive className="size-4" />أرشفة المجتمع (يختفي من الدليل)</>}
          </button>
          {isPlatformAdmin && (
            <button className="btn-danger w-full justify-start" disabled={destroy.isPending}
              onClick={() => prompt(`للحذف النهائي لكل المنشورات والدورات والأعضاء اكتب: ${community.slug}`) === community.slug && destroy.mutate()}>
              <Trash2 className="size-4" />حذف المجتمع نهائيًا
            </button>
          )}
          <ErrorNote error={archive.error ?? destroy.error} />
        </section>
      </div>
    </div>
  )
}

export default function CommunitySettings() {
  const { community, isAdmin } = useCommunity()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'people'
  if (!isAdmin) return <Navigate to=".." replace />
  return (
    <div>
      <PageTitle kicker="إدارة المجتمع" title={community.name} />
      <TabBar<Tab> value={tab} onChange={(t) => setSp(t === 'people' ? {} : { tab: t }, { replace: true })}
        tabs={[{ id: 'people', label: 'المشاركون' }, { id: 'quizzes', label: 'الاختبارات' }, { id: 'attendance', label: 'الحضور' }, { id: 'settings', label: 'الإعدادات' }]} />
      {tab === 'people' && <People />}
      {tab === 'quizzes' && <Quizzes />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
