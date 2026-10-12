import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CourseCover } from '../components/brand'
import { Empty, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCommunity, useTo } from '../lib/community'
import { supabase } from '../lib/supabase'
import type { Course } from '../lib/types'
import { levelFor } from '../lib/utils'

type CourseRow = Course & { modules: { id: string; lessons: { id: string }[] }[] }

export default function Classroom() {
  const { session } = useAuth()
  const { community, member, isStaff, isAdmin } = useCommunity()
  const to = useTo()
  const qc = useQueryClient()
  const level = levelFor(member?.points ?? 0)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [minLevel, setMinLevel] = useState(1)

  const courses = useQuery({
    queryKey: ['courses', community.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*, modules(id, lessons(id))').eq('community_id', community.id).order('position').order('created_at')
      if (error) throw error
      return data as unknown as CourseRow[]
    },
  })

  const done = useQuery({
    queryKey: ['progress', session!.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('lesson_progress').select('lesson_id')
      if (error) throw error
      return new Set(data.map((r) => r.lesson_id as string))
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('courses').insert({
        community_id: community.id, title: title.trim(), description: description.trim() || null, min_level: minLevel, position: courses.data?.length ?? 0,
      })
      if (error) throw error
    },
    onSuccess: () => { setAdding(false); setTitle(''); setDescription(''); setMinLevel(1); qc.invalidateQueries({ queryKey: ['courses'] }) },
  })

  const onSubmit = (e: FormEvent) => { e.preventDefault(); create.mutate() }

  return (
    <div>
      <PageTitle kicker="دورات ودروس مسجلة" title="المكتبة التربوية">
        {isAdmin && <button className="btn-primary" onClick={() => setAdding(!adding)}><Plus className="size-4" />دورة جديدة</button>}
      </PageTitle>

      {adding && (
        <form onSubmit={onSubmit} className="card mb-6 animate-rise space-y-3 p-5">
          <div><label className="label" htmlFor="ct">عنوان الدورة</label><input id="ct" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /></div>
          <div><label className="label" htmlFor="cd">الوصف</label><textarea id="cd" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></div>
          <div>
            <label className="label" htmlFor="cl">المستوى المطلوب للدخول</label>
            <select id="cl" className="input !w-auto" value={minLevel} onChange={(e) => setMinLevel(Number(e.target.value))}>
              {Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>المستوى {i + 1}</option>)}
            </select>
          </div>
          <ErrorNote error={create.error} />
          <div className="flex gap-2"><button className="btn-primary" disabled={create.isPending}>إنشاء</button><button type="button" className="btn-ghost" onClick={() => setAdding(false)}>إلغاء</button></div>
          <p className="text-xs text-muted">تُنشأ الدورة كمسودة. أضف الدروس ثم انشرها من صفحة الدورة.</p>
        </form>
      )}

      <ErrorNote error={courses.error} />
      {courses.isLoading ? <Spinner /> : !courses.data?.length ? (
        <Empty title="لا توجد دورات بعد" hint={isAdmin ? 'أنشئ أول دورة للمجتمع.' : 'سيتم نشر الدورات قريبا.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.data.map((c, i) => {
            const locked = !isStaff && level < c.min_level
            const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id))
            const completed = lessonIds.filter((id) => done.data?.has(id)).length
            const pct = lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0
            return (
              <Link key={c.id} to={to(`/classroom/${c.id}`)} className="card card-hover group flex animate-rise flex-col overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="relative aspect-[16/9] overflow-hidden bg-brand-soft">
                  <div className="size-full">
                  {c.cover_url ? <img src={c.cover_url} alt="" className="size-full object-cover" loading="lazy" /> : <CourseCover index={i} />}
                  </div>
                  {locked && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-dark/80 text-sm font-medium text-white backdrop-blur-[2px]">
                      <span className="grid size-11 place-items-center rounded-full border border-white/30"><Lock className="size-5" /></span>
                      يفتح عند المستوى {c.min_level}
                    </span>
                  )}
                  {!c.published && <span className="tag absolute start-3 top-3 bg-white text-brand">مسودة</span>}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-xs font-medium text-peri">{lessonIds.length} {lessonIds.length > 10 || lessonIds.length < 3 ? 'درس' : 'دروس'} · {c.modules.length} {c.modules.length === 1 ? 'وحدة' : c.modules.length === 2 ? 'وحدتان' : 'وحدات'}</p>
                  <h2 className="text-lg font-bold text-brand">{c.title}</h2>
                  {c.description && <p className="line-clamp-2 text-sm text-muted">{c.description}</p>}
                  {!locked && lessonIds.length > 0 && (
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between text-xs"><span className="text-muted">التقدم</span><span className="font-bold text-brand tabular-nums">{pct}%</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-mint transition-[width] duration-700 ease-out-expo" style={{ width: `${pct}%` }} /></div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
