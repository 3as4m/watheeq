import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CalendarCheck, Check, CheckCheck, Clock, ExternalLink, Radio, Search, Trash2, UserCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OutlineMark } from '../components/brand'
import { Avatar, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { ATTENDANCE_LABEL, ATTENDANCE_TONE, checkInOpen, isAttended, isPast, timeOf } from '../lib/events'
import { supabase } from '../lib/supabase'
import type { Attendance, AttendanceStatus, EventItem, ProfileLite } from '../lib/types'
import { formatDateTime, formatNumber, isHttpUrl } from '../lib/utils'
import { useEventActions } from './Calendar'

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused']

type Ev = EventItem & { event_rsvps: { user_id: string }[] }
type MemberRow = { user_id: string; role: string; profile: ProfileLite }

export default function EventPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { community, member, isStaff, isAdmin } = useCommunity()
  const to = useTo()
  const nav = useNavigate()
  const qc = useQueryClient()
  const uid = session!.user.id
  const [q, setQ] = useState('')
  const { rsvp, checkIn } = useEventActions(community.id)

  const ev = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*, event_rsvps(user_id)').eq('id', id).eq('community_id', community.id).maybeSingle()
      if (error) throw error
      return data as unknown as Ev | null
    },
  })

  // RLS: members get their own row only, staff get the whole roster.
  const att = useQuery({
    queryKey: ['event', id, 'attendance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('event_attendance').select('*').eq('event_id', id)
      if (error) throw error
      return new Map((data as Attendance[]).map((a) => [a.user_id, a]))
    },
  })

  const roster = useQuery({
    queryKey: ['members', community.id, 'roster'],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase.from('members').select('user_id, role, profile:profiles!members_user_id_fkey(id,username,display_name,avatar_url)').eq('community_id', community.id)
      if (error) throw error
      return data as unknown as MemberRow[]
    },
  })

  const refreshAtt = () => { qc.invalidateQueries({ queryKey: ['event', id, 'attendance'] }); qc.invalidateQueries({ queryKey: ['events', community.id] }) }

  const mark = useMutation({
    mutationFn: async ({ userIds, status }: { userIds: string[]; status: AttendanceStatus | null }) => {
      const existing = userIds.filter((u) => att.data?.has(u))
      const fresh = userIds.filter((u) => !att.data?.has(u))
      if (status === null) {
        if (existing.length) { const { error } = await supabase.from('event_attendance').delete().eq('event_id', id).in('user_id', existing); if (error) throw error }
        return
      }
      if (existing.length) { const { error } = await supabase.from('event_attendance').update({ status }).eq('event_id', id).in('user_id', existing); if (error) throw error }
      if (fresh.length) { const { error } = await supabase.from('event_attendance').insert(fresh.map((u) => ({ event_id: id, user_id: u, status }))); if (error) throw error }
    },
    onSuccess: refreshAtt,
  })

  const remove = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('events').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events', community.id] }); nav(to('/calendar')) },
  })

  if (ev.isLoading) return <Spinner />
  const e = ev.data
  if (!e) return <p className="py-16 text-center text-muted">اللقاء غير موجود.</p>

  const going = e.event_rsvps.some((r) => r.user_id === uid)
  const rsvpSet = new Set(e.event_rsvps.map((r) => r.user_id))
  const live = checkInOpen(e)
  const past = isPast(e)
  const mine = att.data?.get(uid)
  const rows = (roster.data ?? [])
    .filter((r) => r.profile.display_name.includes(q.trim()))
    .sort((a, b) => Number(rsvpSet.has(b.user_id)) - Number(rsvpSet.has(a.user_id)) || a.profile.display_name.localeCompare(b.profile.display_name, 'ar'))
  const counts = STATUSES.map((s) => [s, [...(att.data?.values() ?? [])].filter((a) => a.status === s).length] as const)
  const unmarked = (roster.data?.length ?? 0) - (att.data?.size ?? 0)
  const unmarkedRsvps = [...rsvpSet].filter((u) => !att.data?.has(u) && roster.data?.some((r) => r.user_id === u))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={to('/calendar')} className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand">
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />اللقاءات
      </Link>

      <header className="relative overflow-hidden rounded-lg bg-brand px-6 py-8 text-white sm:px-10">
        <OutlineMark className="absolute -bottom-1/2 -end-[8%] w-[55%]" color="#ffffff" opacity={0.13} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            {live && <span className="tag bg-danger text-white"><Radio className="size-3" />مباشر الآن</span>}
            {past && <span className="tag bg-white/15 text-white">انتهى</span>}
            {mine && <span className={`tag ${ATTENDANCE_TONE[mine.status]}`}>حضورك: {ATTENDANCE_LABEL[mine.status]}</span>}
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{e.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-white/75"><Clock className="size-4" />{formatDateTime(e.starts_at)}{e.ends_at && ` - ${timeOf(e.ends_at)}`}</p>
          {e.description && <p className="mt-4 max-w-2xl whitespace-pre-wrap leading-relaxed text-white/80">{e.description}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {live && member && !mine && <button className="btn-light" disabled={checkIn.isPending} onClick={() => checkIn.mutate(e.id)}><UserCheck className="size-4" />سجّل حضورك</button>}
            {!past && !live && (
              <button className="btn-light" disabled={rsvp.isPending} onClick={() => rsvp.mutate({ e: { ...e, event_attendance: [] }, uid })}>
                {going ? <><Check className="size-4 text-mint-deep" />مسجل للحضور</> : <><CalendarCheck className="size-4" />سأحضر</>}
              </button>
            )}
            {!past && e.link_url && isHttpUrl(e.link_url) && <a className="btn btn-bar border border-white/30 text-white hover:bg-white/10" href={e.link_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />رابط الانضمام</a>}
            {isAdmin && <button className="btn ms-auto text-white/70 hover:bg-white/10 hover:text-white" onClick={() => confirm('حذف اللقاء وسجل حضوره؟') && remove.mutate()}><Trash2 className="size-4" />حذف</button>}
          </div>
        </div>
      </header>
      <ErrorNote error={rsvp.error ?? checkIn.error ?? remove.error} />

      {isStaff && (
        <section className="card overflow-hidden" aria-label="سجل الحضور">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold text-brand">سجل الحضور</h2>
            <span className="text-sm text-muted">{formatNumber(e.event_rsvps.length)} سجلوا مسبقًا</span>
            {unmarkedRsvps.length > 0 && (
              <button className="btn-ghost ms-auto" disabled={mark.isPending} onClick={() => mark.mutate({ userIds: unmarkedRsvps, status: 'present' })}>
                <CheckCheck className="size-4" />تحضير المسجلين ({unmarkedRsvps.length})
              </button>
            )}
          </div>
          <dl className="grid grid-cols-5 divide-x divide-x-reverse divide-line border-b border-line text-center">
            {counts.map(([s, n]) => (
              <div key={s} className="px-2 py-3"><dt className="text-xs text-muted">{ATTENDANCE_LABEL[s]}</dt><dd className="text-xl font-bold text-brand tabular-nums">{formatNumber(n)}</dd></div>
            ))}
            <div className="px-2 py-3"><dt className="text-xs text-muted">غير مسجل</dt><dd className="text-xl font-bold text-peri tabular-nums">{formatNumber(Math.max(unmarked, 0))}</dd></div>
          </dl>
          <div className="border-b border-line px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-peri" />
              <input className="input ps-9" placeholder="ابحث عن عضو..." value={q} onChange={(x) => setQ(x.target.value)} aria-label="بحث في الأعضاء" />
            </div>
          </div>
          <ErrorNote error={mark.error ?? roster.error ?? att.error} />
          {roster.isLoading ? <Spinner /> : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const a = att.data?.get(r.user_id)
                return (
                  <li key={r.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Avatar name={r.profile.display_name} src={r.profile.avatar_url} size={38} />
                    <div className="min-w-0 flex-1">
                      <Link to={to(`/u/${r.profile.username}`)} className="font-bold text-brand hover:underline">{r.profile.display_name}</Link>
                      <p className="flex flex-wrap gap-1.5 text-xs text-muted">
                        {rsvpSet.has(r.user_id) && <span className="text-mint-deep">سجّل مسبقًا</span>}
                        {a?.method === 'self' && <span>· سجّل حضوره بنفسه</span>}
                      </p>
                    </div>
                    <div className="inline-flex rounded-md border border-line bg-white p-0.5" role="radiogroup" aria-label={`حضور ${r.profile.display_name}`}>
                      {STATUSES.map((s) => (
                        <button key={s} role="radio" aria-checked={a?.status === s} disabled={mark.isPending}
                          onClick={() => mark.mutate({ userIds: [r.user_id], status: a?.status === s ? null : s })}
                          className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-semibold transition-colors ${a?.status === s ? (isAttended(s) ? 'bg-brand text-white' : s === 'absent' ? 'bg-danger text-white' : 'bg-muted text-white') : 'text-muted hover:text-brand'}`}>
                          {ATTENDANCE_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {a && <button className="btn-quiet !p-1.5" aria-label="مسح الحالة" title="مسح الحالة" onClick={() => mark.mutate({ userIds: [r.user_id], status: null })}><X className="size-4" /></button>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
