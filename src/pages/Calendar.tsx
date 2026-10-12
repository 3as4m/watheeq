import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarCheck, CalendarPlus, Check, Clock, ExternalLink, Radio, UserCheck, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { ATTENDANCE_LABEL, ATTENDANCE_TONE, checkInOpen, EVENT_SELECT, isAttended, isPast, timeOf, type EventRow } from '../lib/events'
import { supabase } from '../lib/supabase'
import { formatNumber, isHttpUrl } from '../lib/utils'

export function useEventActions(communityId: string) {
  const qc = useQueryClient()
  const refresh = () => { qc.invalidateQueries({ queryKey: ['events', communityId] }); qc.invalidateQueries({ queryKey: ['event'] }); qc.invalidateQueries({ queryKey: ['me'] }) }
  const rsvp = useMutation({
    mutationFn: async ({ e, uid }: { e: EventRow; uid: string }) => {
      const going = e.event_rsvps.some((r) => r.user_id === uid)
      const { error } = going
        ? await supabase.from('event_rsvps').delete().eq('event_id', e.id).eq('user_id', uid)
        : await supabase.from('event_rsvps').insert({ event_id: e.id })
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const checkIn = useMutation({
    mutationFn: async (eventId: string) => { const { error } = await supabase.rpc('check_in', { eid: eventId }); if (error) throw error },
    onSuccess: refresh,
  })
  return { rsvp, checkIn, refresh }
}

export default function Calendar() {
  const { session } = useAuth()
  const { community, member, isAdmin, isStaff } = useCommunity()
  const to = useTo()
  const uid = session!.user.id
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ title: '', description: '', starts_at: '', ends_at: '', link_url: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const { rsvp, checkIn, refresh } = useEventActions(community.id)

  const events = useQuery({
    queryKey: ['events', community.id, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('community_id', community.id).order('starts_at').limit(300)
      if (error) throw error
      return data as unknown as EventRow[]
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      if (f.link_url && !isHttpUrl(f.link_url)) throw new Error('الرابط غير صالح')
      const { error } = await supabase.from('events').insert({
        community_id: community.id, title: f.title.trim(), description: f.description.trim() || null,
        starts_at: new Date(f.starts_at).toISOString(), ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, link_url: f.link_url.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => { setAdding(false); setF({ title: '', description: '', starts_at: '', ends_at: '', link_url: '' }); refresh() },
  })

  const onSubmit = (e: FormEvent) => { e.preventDefault(); create.mutate() }
  const all = events.data ?? []
  const upcoming = all.filter((e) => !isPast(e))
  const past = all.filter((e) => isPast(e)).reverse()
  const list = tab === 'upcoming' ? upcoming : past

  // Attendance summary for the viewer across past events since they joined.
  const mineHeld = past.filter((e) => !member || new Date(e.starts_at) >= new Date(new Date(member.joined_at).getTime() - 86400_000))
  const mineAttended = mineHeld.filter((e) => isAttended(e.event_attendance.find((a) => a.user_id === uid)?.status)).length

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle kicker="لقاءات دورية مع المختصين" title="اللقاءات المباشرة">
        {isAdmin && <button className="btn-primary" onClick={() => setAdding(!adding)}><CalendarPlus className="size-4" />لقاء جديد</button>}
      </PageTitle>

      {adding && (
        <form onSubmit={onSubmit} className="card mb-6 animate-rise space-y-3 p-5">
          <div><label className="label" htmlFor="et">العنوان</label><input id="et" className="input" value={f.title} onChange={set('title')} required maxLength={120} /></div>
          <div><label className="label" htmlFor="ed">الوصف</label><textarea id="ed" className="input" value={f.description} onChange={set('description')} maxLength={5000} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="es">يبدأ</label><input id="es" type="datetime-local" className="input" value={f.starts_at} onChange={set('starts_at')} required /></div>
            <div><label className="label" htmlFor="ee">ينتهي (اختياري)</label><input id="ee" type="datetime-local" className="input" value={f.ends_at} onChange={set('ends_at')} min={f.starts_at} /></div>
          </div>
          <div><label className="label" htmlFor="el">رابط الانضمام (اختياري)</label><input id="el" dir="ltr" className="input text-start" value={f.link_url} onChange={set('link_url')} placeholder="https://" /></div>
          <ErrorNote error={create.error} />
          <div className="flex gap-2"><button className="btn-primary" disabled={create.isPending}>إضافة</button><button type="button" className="btn-ghost" onClick={() => setAdding(false)}>إلغاء</button></div>
        </form>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-line bg-white p-1" role="tablist" aria-label="اللقاءات">
          {([['upcoming', 'القادمة', upcoming.length], ['past', 'السابقة', past.length]] as const).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`cursor-pointer rounded-[5px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${tab === k ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}>
              {label}<span className={`ms-1.5 text-xs tabular-nums ${tab === k ? 'text-mint' : 'text-peri'}`}>{n}</span>
            </button>
          ))}
        </div>
        {member && mineHeld.length > 0 && (
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <UserCheck className="size-4 text-mint-deep" />حضرت <strong className="text-brand tabular-nums">{mineAttended}</strong> من {mineHeld.length} لقاءات
          </p>
        )}
      </div>

      <ErrorNote error={events.error ?? rsvp.error ?? checkIn.error} />
      {events.isLoading ? <Spinner /> : !list.length ? (
        <Empty title={tab === 'upcoming' ? 'لا توجد لقاءات قادمة' : 'لا توجد لقاءات سابقة'} hint={tab === 'upcoming' ? 'ستظهر هنا اللقاءات المباشرة فور الإعلان عنها.' : undefined} />
      ) : (
        <ul className="space-y-4">
          {list.map((e, i) => {
            const going = e.event_rsvps.some((r) => r.user_id === uid)
            const mine = e.event_attendance.find((a) => a.user_id === uid)?.status
            const live = checkInOpen(e)
            const d = new Date(e.starts_at)
            const featured = tab === 'upcoming' && i === 0
            const presentCount = e.event_attendance.filter((a) => isAttended(a.status)).length
            return (
              <li key={e.id} style={{ animationDelay: `${i * 70}ms` }}
                className={`card card-hover flex animate-rise overflow-hidden ${featured ? 'border-brand' : ''} ${tab === 'past' ? 'opacity-95' : ''}`}>
                <div className={`flex w-24 shrink-0 flex-col items-center justify-center py-5 sm:w-28 ${featured ? 'bg-brand text-white' : 'border-e border-line bg-cloud text-brand'}`}>
                  <span className={`text-xs font-medium ${featured ? 'text-mint' : 'text-peri'}`}>{d.toLocaleDateString('ar-u-nu-latn', { weekday: 'long' })}</span>
                  <span className="text-4xl font-bold leading-tight tabular-nums">{d.getDate()}</span>
                  <span className="text-sm font-semibold">{d.toLocaleDateString('ar-u-nu-latn', { month: 'long' })}</span>
                </div>
                <div className="min-w-0 flex-1 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {live && <span className="tag bg-danger text-white"><Radio className="size-3" />مباشر الآن</span>}
                    {featured && !live && <span className="tag bg-mint-soft text-mint-deep">اللقاء القادم</span>}
                    {mine && <span className={`tag ${ATTENDANCE_TONE[mine]}`}>{ATTENDANCE_LABEL[mine]}</span>}
                    {tab === 'past' && !mine && member && <span className="tag bg-cloud text-muted">لم يسجل حضورك</span>}
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold leading-snug text-brand">
                    <Link to={to(`/calendar/${e.id}`)} className="hover:underline">{e.title}</Link>
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><Clock className="size-3.5" />{timeOf(e.starts_at)}{e.ends_at && ` - ${timeOf(e.ends_at)}`}</p>
                  {e.description && tab === 'upcoming' && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[15px] leading-7 text-ink/85">{e.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {live && member && !mine && (
                      <button className="btn-primary" disabled={checkIn.isPending} onClick={() => checkIn.mutate(e.id)}><UserCheck className="size-4" />سجّل حضورك</button>
                    )}
                    {tab === 'upcoming' && !live && (
                      <button className={going ? 'btn-ghost' : 'btn-primary'} disabled={rsvp.isPending} onClick={() => rsvp.mutate({ e, uid })} aria-pressed={going}>
                        {going ? <><Check key="y" className="size-4 animate-pop text-mint-deep" />مسجل للحضور</> : <><CalendarCheck className="size-4" />سأحضر</>}
                      </button>
                    )}
                    {tab === 'upcoming' && e.link_url && isHttpUrl(e.link_url) && <a className="btn-quiet" href={e.link_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />رابط الانضمام</a>}
                    {isStaff && (
                      <Link to={to(`/calendar/${e.id}`)} className="btn-quiet"><UserCheck className="size-4" />{tab === 'past' ? `الحضور ${formatNumber(presentCount)}` : 'سجل الحضور'}<ArrowLeft className="size-4" /></Link>
                    )}
                    <span className="ms-auto inline-flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" />{formatNumber(e.event_rsvps.length)} {tab === 'past' ? 'سجلوا' : 'سيحضرون'}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
