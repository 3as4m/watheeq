import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { OutlineMark } from '../components/brand'
import { Empty, ErrorNote, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Course, Lesson, Module } from '../lib/types'
import { embedUrl, isHttpUrl, levelFor } from '../lib/utils'

function LessonEditor({ moduleId, lesson, position, onDone }: { moduleId: string; lesson?: Lesson; position: number; onDone: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(lesson?.title ?? '')
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '')
  const [body, setBody] = useState(lesson?.body ?? '')
  const [err, setErr] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      if (videoUrl && !isHttpUrl(videoUrl)) throw new Error('رابط الفيديو غير صالح')
      const row = { title: title.trim(), video_url: videoUrl.trim() || null, body: body.trim() }
      const { error } = lesson
        ? await supabase.from('lessons').update(row).eq('id', lesson.id)
        : await supabase.from('lessons').insert({ ...row, module_id: moduleId, position })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['course'] }); qc.invalidateQueries({ queryKey: ['courses'] }); onDone() },
    onError: (e) => setErr(e.message),
  })
  const submit = (e: FormEvent) => { e.preventDefault(); setErr(''); save.mutate() }

  return (
    <form onSubmit={submit} className="card animate-rise space-y-3 p-5 sm:p-6">
      <div><label className="label" htmlFor="lt">عنوان الدرس</label><input id="lt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /></div>
      <div><label className="label" htmlFor="lv">رابط الفيديو (يوتيوب أو فيميو)</label><input id="lv" dir="ltr" className="input text-start" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" /></div>
      <div><label className="label" htmlFor="lb">محتوى الدرس</label><textarea id="lb" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} maxLength={50000} /></div>
      {err && <ErrorNote error={new Error(err)} />}
      <div className="flex gap-2"><button className="btn-primary" disabled={save.isPending}>حفظ</button><button type="button" className="btn-ghost" onClick={onDone}>إلغاء</button></div>
    </form>
  )
}

export default function CoursePage() {
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const qc = useQueryClient()
  const { session, member, isStaff, isAdmin } = useAuth()
  const level = levelFor(member?.points ?? 0)
  const [editing, setEditing] = useState<{ moduleId: string; lesson?: Lesson } | null>(null)
  const [newModule, setNewModule] = useState('')

  const course = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*, modules(*, lessons(*))').eq('id', id).single()
      if (error) throw error
      const c = data as unknown as Course & { modules: Module[] }
      c.modules.sort((a, b) => a.position - b.position)
      c.modules.forEach((m) => m.lessons.sort((a, b) => a.position - b.position))
      return c
    },
  })

  const progress = useQuery({
    queryKey: ['progress', session!.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('lesson_progress').select('lesson_id')
      if (error) throw error
      return new Set(data.map((r) => r.lesson_id as string))
    },
  })

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['course', id] }); qc.invalidateQueries({ queryKey: ['courses'] }) }

  const toggleDone = useMutation({
    mutationFn: async (lessonId: string) => {
      const done = progress.data?.has(lessonId)
      const { error } = done
        ? await supabase.from('lesson_progress').delete().eq('lesson_id', lessonId).eq('user_id', session!.user.id)
        : await supabase.from('lesson_progress').insert({ lesson_id: lessonId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress'] }),
  })

  const addModule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('modules').insert({ course_id: id, title: newModule.trim(), position: course.data?.modules.length ?? 0 })
      if (error) throw error
    },
    onSuccess: () => { setNewModule(''); invalidate() },
  })

  const mutateRow = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: { message: string } | null }>) => { const { error } = await fn(); if (error) throw new Error(error.message) },
    onSuccess: invalidate,
  })

  if (course.isLoading) return <Spinner />
  const c = course.data
  if (!c) return <p className="py-16 text-center text-muted">الدورة غير موجودة.</p>

  const locked = !isStaff && level < c.min_level
  const lessons = c.modules.flatMap((m) => m.lessons)
  const currentId = sp.get('lesson') ?? lessons.find((l) => !progress.data?.has(l.id))?.id ?? lessons[0]?.id
  const current = lessons.find((l) => l.id === currentId)
  const embed = embedUrl(current?.video_url ?? null)

  const doneCount = lessons.filter((l) => progress.data?.has(l.id)).length
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0
  const idx = lessons.findIndex((l) => l.id === currentId)
  const nextLesson = idx >= 0 ? lessons[idx + 1] : undefined
  const isDone = current ? progress.data?.has(current.id) : false
  const moduleNo = (mid: string) => c.modules.findIndex((m) => m.id === mid) + 1

  return (
    <div>
      <Link to="/classroom" className="group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand">
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />المكتبة التربوية
      </Link>

      <header className="relative mb-8 overflow-hidden rounded-lg bg-brand px-6 py-8 text-white sm:px-10">
        <OutlineMark className="absolute -bottom-1/2 -end-[8%] w-[55%]" color="#ffffff" opacity={0.13} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-mint">دورة · {lessons.length} {lessons.length >= 3 && lessons.length <= 10 ? 'دروس' : 'درس'}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{c.title}</h1>
            {c.description && <p className="mt-3 leading-relaxed text-white/75">{c.description}</p>}
          </div>
          <div className="flex items-center gap-4">
            {!locked && lessons.length > 0 && (
              <div className="min-w-44">
                <div className="flex justify-between text-xs text-white/70"><span>أكملت {doneCount} من {lessons.length}</span><span className="font-bold text-white tabular-nums">{pct}%</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-mint transition-[width] duration-700 ease-out-expo" style={{ width: `${pct}%` }} /></div>
              </div>
            )}
            {isAdmin && (
              <button className="btn-light" onClick={() => mutateRow.mutate(() => supabase.from('courses').update({ published: !c.published }).eq('id', id))}>
                {c.published ? <><EyeOff className="size-4" />إلغاء النشر</> : <><Eye className="size-4" />نشر الدورة</>}
              </button>
            )}
          </div>
        </div>
      </header>
      <ErrorNote error={mutateRow.error ?? toggleDone.error ?? addModule.error} />

      {locked ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand"><Lock className="size-6" /></span>
          <p className="text-lg font-bold text-brand">هذه الدورة تفتح عند المستوى {c.min_level}</p>
          <p className="max-w-sm text-sm text-muted">مستواك الحالي {level}. شارك في المجتمع بمنشورات وتعليقات نافعة لتجمع النقاط وترتفع مستوياتك.</p>
          <Link to="/" className="btn-primary mt-2">اذهب إلى المجتمع<ArrowLeft className="size-4" /></Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
          <section className="min-w-0">
            {editing ? (
              <LessonEditor moduleId={editing.moduleId} lesson={editing.lesson} position={c.modules.find((m) => m.id === editing.moduleId)?.lessons.length ?? 0} onDone={() => setEditing(null)} />
            ) : current ? (
              <article key={current.id} className="card animate-rise overflow-hidden">
                {embed ? (
                  <div className="aspect-video bg-brand-dark">
                    <iframe src={embed} title={current.title} className="size-full" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                  </div>
                ) : current.video_url && isHttpUrl(current.video_url) ? (
                  <a href={current.video_url} target="_blank" rel="noreferrer" className="block bg-brand-soft px-5 py-4 text-sm font-medium text-brand" dir="ltr">{current.video_url}</a>
                ) : null}
                <div className="p-6 sm:p-10">
                  <p className="kicker">الوحدة {String(moduleNo(current.module_id)).padStart(2, '0')} · الدرس {String(idx + 1).padStart(2, '0')}</p>
                  <h2 className="mt-1 border-s-[5px] border-mint ps-3.5 text-2xl font-bold leading-snug text-brand sm:text-[1.75rem]">{current.title}</h2>
                  {current.body && <div className="mt-6 max-w-[68ch] space-y-5 text-[17px] leading-9 text-ink/90">
                    {current.body.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-wrap break-words">{para}</p>)}
                  </div>}
                  <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-6">
                    <button className={isDone ? 'btn-ghost' : 'btn-primary'} disabled={toggleDone.isPending} onClick={() => toggleDone.mutate(current.id)}>
                      {isDone ? <CheckCircle2 key="done" className="size-4 animate-pop text-mint-deep" /> : <Check className="size-4" />}
                      {isDone ? 'تم الإكمال' : 'إكمال الدرس'}
                    </button>
                    {nextLesson && (
                      <button className="btn-quiet" onClick={() => { setSp({ lesson: nextLesson.id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                        الدرس التالي<ArrowLeft className="size-4" />
                      </button>
                    )}
                    {isAdmin && <button className="btn-quiet ms-auto" onClick={() => setEditing({ moduleId: current.module_id, lesson: current })}><Pencil className="size-4" />تعديل</button>}
                  </div>
                </div>
              </article>
            ) : (
              <Empty title="لا توجد دروس بعد" hint={isAdmin ? 'أضف وحدة ثم أضف إليها الدروس.' : undefined} />
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {c.modules.map((m, mi) => (
              <div key={m.id} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-peri">الوحدة {String(mi + 1).padStart(2, '0')}</p>
                    <h3 className="truncate text-sm font-bold text-brand">{m.title}</h3>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-0.5">
                      <button className="btn-quiet !p-1.5" aria-label="إضافة درس" title="إضافة درس" onClick={() => setEditing({ moduleId: m.id })}><Plus className="size-4" /></button>
                      <button className="btn-danger !p-1.5" aria-label="حذف الوحدة" title="حذف الوحدة"
                        onClick={() => confirm('حذف الوحدة وكل دروسها؟') && mutateRow.mutate(() => supabase.from('modules').delete().eq('id', m.id))}><Trash2 className="size-4" /></button>
                    </div>
                  )}
                </div>
                <ul className="py-1">
                  {m.lessons.map((l) => {
                    const on = l.id === currentId
                    const done = progress.data?.has(l.id)
                    return (
                      <li key={l.id} className="group/l flex items-center">
                        <button onClick={() => { setEditing(null); setSp({ lesson: l.id }) }} aria-current={on ? 'true' : undefined}
                          className={`relative flex flex-1 cursor-pointer items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-e before:bg-mint before:transition-transform ${
                            on ? 'bg-brand-soft/60 font-bold text-brand before:scale-y-100' : 'text-ink/85 before:scale-y-0 hover:bg-cloud'}`}>
                          {done
                            ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mint text-white"><Check className="size-3" strokeWidth={3} /></span>
                            : <span className={`size-5 shrink-0 rounded-full border-2 ${on ? 'border-brand' : 'border-line'}`} />}
                          <span className="flex-1 leading-snug">{l.title}</span>
                          {!l.published && <span className="tag bg-cloud text-muted">مخفي</span>}
                        </button>
                        {isAdmin && (
                          <button className="btn-danger me-1 !p-1.5 opacity-0 transition-opacity group-hover/l:opacity-100 focus-visible:opacity-100" aria-label="حذف الدرس" title="حذف الدرس"
                            onClick={() => confirm('حذف هذا الدرس؟') && mutateRow.mutate(() => supabase.from('lessons').delete().eq('id', l.id))}><Trash2 className="size-3.5" /></button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {isAdmin && (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newModule.trim()) addModule.mutate() }}>
                <input className="input" placeholder="وحدة جديدة" value={newModule} onChange={(e) => setNewModule(e.target.value)} maxLength={120} aria-label="اسم الوحدة" />
                <button className="btn-primary btn-icon" disabled={addModule.isPending} aria-label="إضافة وحدة"><Plus className="size-4" /></button>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
