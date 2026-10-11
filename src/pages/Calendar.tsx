import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CalendarPlus, Check, Clock, ExternalLink, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { EventItem } from '../lib/types'
import { formatNumber, isHttpUrl } from '../lib/utils'

type Ev = EventItem & { event_rsvps: { user_id: string }[] }

export default function Calendar() {
  const { session, community, isAdmin } = useAuth()
  const uid = session!.user.id
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ title: '', description: '', starts_at: '', ends_at: '', link_url: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const since = new Date(Date.now() - 3 * 3600_000).toISOString()
      const { data, error } = await supabase.from('events').select('*, event_rsvps(user_id)').gte('starts_at', since).order('starts_at')
      if (error) throw error
      return data as unknown as Ev[]
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['events'] })

  const create = useMutation({
    mutationFn: async () => {
      if (f.link_url && !isHttpUrl(f.link_url)) throw new Error('الرابط غير صالح')
      const { error } = await supabase.from('events').insert({
        community_id: community!.id, title: f.title.trim(), description: f.description.trim() || null,
        starts_at: new Date(f.starts_at).toISOString(), ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, link_url: f.link_url.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => { setAdding(false); setF({ title: '', description: '', starts_at: '', ends_at: '', link_url: '' }); refresh() },
  })

  const rsvp = useMutation({
    mutationFn: async (e: Ev) => {
      const going = e.event_rsvps.some((r) => r.user_id === uid)
      const { error } = going
        ? await supabase.from('event_rsvps').delete().eq('event_id', e.id).eq('user_id', uid)
        : await supabase.from('event_rsvps').insert({ event_id: e.id })
      if (error) throw error
    },
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('events').delete().eq('id', id); if (error) throw error },
    onSuccess: refresh,
  })

  const onSubmit = (e: FormEvent) => { e.preventDefault(); create.mutate() }

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

      <ErrorNote error={events.error ?? rsvp.error ?? remove.error} />
      {events.isLoading ? <Spinner /> : !events.data?.length ? <Empty title="لا توجد لقاءات قادمة" hint="ستظهر هنا اللقاءات المباشرة فور الإعلان عنها." /> : (
        <ul className="space-y-4">
          {events.data.map((e, i) => {
            const going = e.event_rsvps.some((r) => r.user_id === uid)
            const d = new Date(e.starts_at)
            const featured = i === 0
            const time = d.toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' })
            const end = e.ends_at ? new Date(e.ends_at).toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' }) : null
            return (
              <li key={e.id} style={{ animationDelay: `${i * 70}ms` }}
                className={`card card-hover flex animate-rise overflow-hidden ${featured ? 'border-brand' : ''}`}>
                <div className={`flex w-24 shrink-0 flex-col items-center justify-center py-5 sm:w-28 ${featured ? 'bg-brand text-white' : 'border-e border-line bg-cloud text-brand'}`}>
                  <span className={`text-xs font-medium ${featured ? 'text-mint' : 'text-peri'}`}>{d.toLocaleDateString('ar-u-nu-latn', { weekday: 'long' })}</span>
                  <span className="text-4xl font-bold leading-tight tabular-nums">{d.getDate()}</span>
                  <span className="text-sm font-semibold">{d.toLocaleDateString('ar-u-nu-latn', { month: 'long' })}</span>
                </div>
                <div className="min-w-0 flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {featured && <span className="tag mb-2 bg-mint-soft text-mint-deep">اللقاء القادم</span>}
                      <h2 className="text-lg font-bold leading-snug text-brand">{e.title}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><Clock className="size-3.5" />{time}{end && ` - ${end}`}</p>
                    </div>
                    {isAdmin && <button className="btn-danger btn-icon !p-2" aria-label="حذف اللقاء" onClick={() => confirm('حذف اللقاء؟') && remove.mutate(e.id)}><Trash2 className="size-4" /></button>}
                  </div>
                  {e.description && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-ink/85">{e.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button className={going ? 'btn-ghost' : 'btn-primary'} disabled={rsvp.isPending} onClick={() => rsvp.mutate(e)} aria-pressed={going}>
                      {going ? <><Check key="y" className="size-4 animate-pop text-mint-deep" />مسجل للحضور</> : <><CalendarCheck className="size-4" />سأحضر</>}
                    </button>
                    {e.link_url && isHttpUrl(e.link_url) && <a className="btn-quiet" href={e.link_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />رابط الانضمام</a>}
                    <span className="ms-auto inline-flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" />{formatNumber(e.event_rsvps.length)} سيحضرون</span>
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
