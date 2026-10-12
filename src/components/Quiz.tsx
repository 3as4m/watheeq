import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ClipboardCheck, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useCommunity } from '../lib/community'
import { supabase } from '../lib/supabase'
import type { QuestionKind, Quiz, QuizAttempt, QuizOption, QuizResult } from '../lib/types'
import { formatNumber } from '../lib/utils'
import { OutlineMark } from './brand'
import { ErrorNote } from './ui'

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي']
const KIND_LABEL: Record<QuestionKind, string> = { single: 'اختيار واحد', multiple: 'اختيار متعدد', text: 'إجابة مفتوحة' }

type Answers = Record<string, string[] | string>

function questionsLabel(n: number) {
  return n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالان' : n <= 10 ? `${n} أسئلة` : `${n} سؤالًا`
}

export function useLessonQuiz(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['quiz', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase.from('quizzes').select('*, quiz_questions(*)').eq('lesson_id', lessonId!).maybeSingle()
      if (error) throw error
      if (!data) return null
      const q = data as unknown as Quiz
      q.quiz_questions.sort((a, b) => a.position - b.position)
      return q
    },
  })
}

/** Score dial: a navy ring that fills to the score, mint when passed. */
function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setShown(score)); return () => cancelAnimationFrame(t) }, [score])
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-white/15" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round" stroke={passed ? '#70c997' : '#8faad1'}
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </svg>
      <span className="text-4xl font-bold tabular-nums" dir="ltr">{score}<span className="text-xl">%</span></span>
    </div>
  )
}

function OptionButton({ index, text, selected, multiple, onClick, state }: {
  index: number; text: string; selected: boolean; multiple: boolean; onClick?: () => void; state?: 'right' | 'wrong' | 'missed'
}) {
  const tone = state === 'right' ? 'border-mint bg-mint-soft text-ink'
    : state === 'wrong' ? 'border-danger/60 bg-danger/5 text-ink'
    : state === 'missed' ? 'border-mint border-dashed bg-white text-ink'
    : selected ? 'border-brand bg-brand-soft/70 text-brand' : 'border-line bg-white text-ink/90 hover:border-brand/40'
  const tile = state === 'right' ? 'bg-mint text-white' : state === 'wrong' ? 'bg-danger text-white'
    : selected && !state ? 'bg-brand text-white' : 'bg-cloud text-brand'
  return (
    <button type="button" onClick={onClick} disabled={!onClick} role={multiple ? 'checkbox' : 'radio'} aria-checked={selected}
      className={`flex w-full items-center gap-3 rounded-md border-2 px-3 py-3 text-start text-[15px] font-medium transition-colors duration-200 enabled:cursor-pointer ${tone}`}>
      <span className={`grid size-8 shrink-0 place-items-center text-sm font-bold transition-colors duration-200 ${multiple ? 'rounded-[4px]' : 'rounded-full'} ${tile}`}>
        {state === 'right' ? <Check className="size-4" strokeWidth={3} /> : state === 'wrong' ? <X className="size-4" strokeWidth={3} /> : LETTERS[index] ?? index + 1}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
    </button>
  )
}

/** The quiz block under a lesson: intro card, one-question-at-a-time runner, and the marked review. */
export function LessonQuiz({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const { session } = useAuth()
  const { isAdmin } = useCommunity()
  const uid = session!.user.id
  const qc = useQueryClient()
  const quiz = useLessonQuiz(lessonId)
  const [mode, setMode] = useState<'intro' | 'run' | 'result' | 'edit'>('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const attempts = useQuery({
    queryKey: ['quiz-attempts', quiz.data?.id, uid],
    enabled: !!quiz.data,
    queryFn: async () => {
      const { data, error } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', quiz.data!.id).eq('user_id', uid).order('created_at', { ascending: false })
      if (error) throw error
      return data as QuizAttempt[]
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('submit_quiz', { qid: quiz.data!.id, answers })
      if (error) throw error
      return data as QuizResult
    },
    onSuccess: (r) => {
      setResult(r); setMode('result')
      qc.invalidateQueries({ queryKey: ['quiz-attempts'] }); qc.invalidateQueries({ queryKey: ['course-quizzes'] })
      if (r.points_awarded) qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const remove = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('quizzes').delete().eq('id', quiz.data!.id); if (error) throw error },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quiz', lessonId] }); qc.invalidateQueries({ queryKey: ['course-quizzes'] }) },
  })

  if (quiz.isLoading) return null
  if (mode === 'edit') {
    return <QuizEditor lessonId={lessonId} lessonTitle={lessonTitle} quiz={quiz.data ?? undefined} onDone={() => setMode('intro')} />
  }
  const q = quiz.data
  if (!q) {
    return isAdmin ? (
      <button onClick={() => setMode('edit')}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-5 py-6 text-sm font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand">
        <Plus className="size-4" />إضافة اختبار بعد هذا الدرس
      </button>
    ) : null
  }

  const questions = q.quiz_questions
  const best = attempts.data?.length ? Math.max(...attempts.data.map((a) => a.score)) : null
  const passedBefore = attempts.data?.some((a) => a.passed)
  const start = () => { setAnswers({}); setStep(0); setResult(null); setMode('run'); submit.reset() }

  if (mode === 'intro') {
    return (
      <section className="card relative overflow-hidden" aria-label="اختبار الدرس">
        <div className="flex flex-col sm:flex-row">
          <div className="relative flex items-center justify-center overflow-hidden bg-brand px-8 py-7 text-white sm:w-44">
            <OutlineMark className="absolute -bottom-6 -end-6 w-[140%]" color="#ffffff" opacity={0.14} />
            <ClipboardCheck className="relative size-12 text-mint" strokeWidth={1.6} />
          </div>
          <div className="flex-1 p-6">
            <p className="kicker">اختبار قصير</p>
            <h3 className="mt-0.5 text-xl font-bold text-brand">{q.title}</h3>
            {q.description && <p className="mt-2 text-[15px] leading-7 text-ink/80">{q.description}</p>}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{questionsLabel(questions.length)}</span>
              <span>النجاح من {q.pass_score}%</span>
              {q.points > 0 && <span className="font-semibold text-mint-deep">+{q.points} نقاط عند النجاح</span>}
            </p>
            {best !== null && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm">
                <span className={`tag ${passedBefore ? 'bg-mint-soft text-mint-deep' : 'bg-cloud text-muted'}`}>{passedBefore ? 'ناجح' : 'لم تنجح بعد'}</span>
                <span className="text-muted">أفضل نتيجة <strong className="text-brand tabular-nums">{best}%</strong> · {formatNumber(attempts.data!.length)} محاولة</span>
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button className="btn-primary" onClick={start} disabled={!questions.length}>
                {best === null ? <>ابدأ الاختبار<ArrowLeft className="size-4" /></> : <><RotateCcw className="size-4" />أعد المحاولة</>}
              </button>
              {!q.published && <span className="tag bg-cloud text-muted">مخفي عن الأعضاء</span>}
              {isAdmin && (
                <span className="ms-auto flex gap-1">
                  <button className="btn-quiet" onClick={() => setMode('edit')}><Pencil className="size-4" />تعديل</button>
                  <button className="btn-danger btn-icon !p-2" aria-label="حذف الاختبار" onClick={() => confirm('حذف الاختبار وكل محاولاته؟') && remove.mutate()}><Trash2 className="size-4" /></button>
                </span>
              )}
            </div>
            <div className="mt-3"><ErrorNote error={remove.error} /></div>
          </div>
        </div>
      </section>
    )
  }

  if (mode === 'result' && result) {
    const byId = new Map(result.results.map((r) => [r.question_id, r]))
    return (
      <section className="card overflow-hidden" aria-label="نتيجة الاختبار">
        <div className="relative flex flex-col items-center gap-6 overflow-hidden bg-brand px-6 py-8 text-white sm:flex-row sm:px-8">
          <OutlineMark className="absolute -bottom-1/2 -start-[5%] w-[55%]" color="#ffffff" opacity={0.12} />
          <div className="relative"><ScoreRing score={result.score} passed={result.passed} /></div>
          <div className="relative text-center sm:text-start">
            <p className="text-sm font-medium text-mint">{result.passed ? 'أحسنت، اجتزت الاختبار' : 'قاربت، حاول مرة أخرى'}</p>
            <h3 className="mt-1 text-2xl font-bold">{result.correct_count} من {result.graded_count} إجابات صحيحة</h3>
            {result.points_awarded > 0 && <p className="mt-2 inline-flex animate-pop rounded-[3px] bg-mint px-2 py-1 text-sm font-bold text-brand-dark">+{result.points_awarded} نقاط</p>}
          </div>
        </div>
        <ol className="divide-y divide-line">
          {questions.map((qq, i) => {
            const r = byId.get(qq.id)
            const picked = answers[qq.id]
            return (
              <li key={qq.id} className="animate-rise p-6" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="flex items-start gap-2 font-bold text-brand">
                  <span className="text-peri tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{qq.prompt}</span>
                  {r?.correct === true && <span className="tag bg-mint-soft text-mint-deep">صحيح</span>}
                  {r?.correct === false && <span className="tag bg-danger/10 text-danger">خطأ</span>}
                </p>
                {qq.kind === 'text' ? (
                  <p className="mt-3 whitespace-pre-wrap border-s-4 border-line bg-cloud px-4 py-3 text-[15px] text-ink/85">{typeof picked === 'string' && picked.trim() ? picked : 'بدون إجابة'}</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {qq.options.map((o, oi) => {
                      const chosen = Array.isArray(picked) && picked.includes(o.id)
                      const isRight = r?.correct_options.includes(o.id)
                      const state = isRight && chosen ? 'right' : chosen ? 'wrong' : isRight ? 'missed' : undefined
                      return <OptionButton key={o.id} index={oi} text={o.text} selected={chosen} multiple={qq.kind === 'multiple'} state={state} />
                    })}
                  </div>
                )}
                {r?.explanation && <p className="mt-3 border-s-4 border-mint bg-mint-soft/60 px-4 py-2.5 text-sm leading-7 text-ink/85">{r.explanation}</p>}
              </li>
            )
          })}
        </ol>
        <div className="flex gap-2 border-t border-line bg-cloud/60 px-6 py-4">
          <button className="btn-primary" onClick={start}><RotateCcw className="size-4" />إعادة الاختبار</button>
          <button className="btn-quiet" onClick={() => setMode('intro')}>إغلاق</button>
        </div>
      </section>
    )
  }

  // runner
  const cur = questions[step]
  const last = step === questions.length - 1
  const val = answers[cur.id]
  const picked = Array.isArray(val) ? val : []
  const answered = cur.kind === 'text' ? true : picked.length > 0
  const pick = (id: string) => setAnswers((a) => {
    if (cur.kind === 'single') return { ...a, [cur.id]: [id] }
    const prev = Array.isArray(a[cur.id]) ? (a[cur.id] as string[]) : []
    return { ...a, [cur.id]: prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id] }
  })

  return (
    <section className="card overflow-hidden" aria-label="الاختبار">
      <div className="border-b border-line px-6 pb-4 pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-brand">{q.title}</span>
          <span className="text-muted tabular-nums">السؤال {step + 1} من {questions.length}</span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {questions.map((x, i) => (
            <span key={x.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span className={`block h-full rounded-full bg-mint transition-transform duration-500 ease-out-expo ${i <= step ? 'scale-x-100' : 'scale-x-0'} origin-right`} />
            </span>
          ))}
        </div>
      </div>
      <div key={cur.id} className="animate-rise p-6 [animation-duration:0.45s]">
        <p className="text-xs font-semibold text-peri">{KIND_LABEL[cur.kind]}{cur.kind === 'multiple' && ' · اختر كل ما ينطبق'}</p>
        <h3 className="mt-1 text-xl font-bold leading-snug text-brand">{cur.prompt}</h3>
        {cur.kind === 'text' ? (
          <>
            <textarea className="input mt-5 min-h-32" value={typeof val === 'string' ? val : ''} maxLength={4000} aria-label="إجابتك"
              onChange={(e) => setAnswers((a) => ({ ...a, [cur.id]: e.target.value }))} placeholder="اكتب إجابتك بحرية..." autoFocus />
            <p className="mt-2 text-xs text-muted">هذا سؤال تأملي لا يُصحح، وتصل إجابتك إلى فريق المجتمع ليتابع رحلتك.</p>
          </>
        ) : (
          <div className="mt-5 space-y-2" role={cur.kind === 'multiple' ? 'group' : 'radiogroup'}>
            {cur.options.map((o, i) => (
              <OptionButton key={o.id} index={i} text={o.text} selected={picked.includes(o.id)} multiple={cur.kind === 'multiple'} onClick={() => pick(o.id)} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-cloud/60 px-6 py-4">
        {step > 0 && <button className="btn-quiet" onClick={() => setStep(step - 1)}><ArrowRight className="size-4" />السابق</button>}
        <button className="btn-quiet" onClick={() => setMode('intro')}>إلغاء</button>
        <div className="ms-auto">
          {last ? (
            <button className="btn-primary" disabled={!answered || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? 'جار التصحيح...' : 'إرسال الإجابات'}</button>
          ) : (
            <button className="btn-primary" disabled={!answered} onClick={() => setStep(step + 1)}>التالي<ArrowLeft className="size-4" /></button>
          )}
        </div>
      </div>
      {submit.error && <div className="px-6 pb-4"><ErrorNote error={submit.error} /></div>}
    </section>
  )
}

// ---------------------------------------------------------------- editor

interface Draft { id?: string; kind: QuestionKind; prompt: string; options: QuizOption[]; correct: string[]; explanation: string }

const newId = () => Math.random().toString(36).slice(2, 8)
const blankQuestion = (): Draft => ({ kind: 'single', prompt: '', options: [{ id: newId(), text: '' }, { id: newId(), text: '' }], correct: [], explanation: '' })

export function QuizEditor({ lessonId, lessonTitle, quiz, onDone }: { lessonId: string; lessonTitle: string; quiz?: Quiz; onDone: () => void }) {
  const qc = useQueryClient()
  const [meta, setMeta] = useState({
    title: quiz?.title ?? `اختبار: ${lessonTitle}`.slice(0, 120), description: quiz?.description ?? '',
    pass_score: quiz?.pass_score ?? 60, points: quiz?.points ?? 5, published: quiz?.published ?? true,
  })
  const [items, setItems] = useState<Draft[] | null>(quiz ? null : [blankQuestion()])

  // Existing quiz: load the answer keys (staff-only table) and build the drafts.
  const keys = useQuery({
    queryKey: ['quiz-keys', quiz?.id],
    enabled: !!quiz,
    queryFn: async () => {
      const ids = quiz!.quiz_questions.map((x) => x.id)
      const { data, error } = await supabase.from('quiz_answer_keys').select('*').in('question_id', ids)
      if (error) throw error
      return new Map((data as { question_id: string; correct: string[]; explanation: string | null }[]).map((k) => [k.question_id, k]))
    },
  })
  useEffect(() => {
    if (!quiz || !keys.data || items) return
    setItems(quiz.quiz_questions.map((x) => ({
      id: x.id, kind: x.kind, prompt: x.prompt, options: x.options.length ? x.options : [{ id: newId(), text: '' }, { id: newId(), text: '' }],
      correct: keys.data.get(x.id)?.correct ?? [], explanation: keys.data.get(x.id)?.explanation ?? '',
    })))
  }, [quiz, keys.data, items])

  const save = useMutation({
    mutationFn: async () => {
      const questions = (items ?? []).map((d) => {
        const options = d.options.filter((o) => o.text.trim()).map((o) => ({ id: o.id, text: o.text.trim() }))
        return { id: d.id, kind: d.kind, prompt: d.prompt, options, correct: d.correct.filter((c) => options.some((o) => o.id === c)), explanation: d.explanation }
      })
      const { error } = await supabase.rpc('save_quiz', { p: { id: quiz?.id, lesson_id: lessonId, ...meta, questions } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', lessonId] }); qc.invalidateQueries({ queryKey: ['quiz-keys'] }); qc.invalidateQueries({ queryKey: ['course-quizzes'] })
      onDone()
    },
  })

  const update = (i: number, patch: Partial<Draft>) => setItems((xs) => xs!.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: -1 | 1) => setItems((xs) => {
    const a = [...xs!]; const j = i + d
    if (j < 0 || j >= a.length) return a
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  })
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate() }

  if (!items) return <div className="card p-6 text-sm text-muted">جار تحميل الاختبار...</div>

  return (
    <form onSubmit={submit} className="card animate-rise overflow-hidden">
      <div className="border-b border-line bg-cloud/60 px-6 py-4">
        <p className="kicker">{quiz ? 'تعديل الاختبار' : 'اختبار جديد بعد الدرس'}</p>
        <p className="font-bold text-brand">{lessonTitle}</p>
      </div>
      <div className="space-y-4 p-6">
        <div><label className="label" htmlFor="qt">عنوان الاختبار</label><input id="qt" className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} required maxLength={120} /></div>
        <div><label className="label" htmlFor="qd">تمهيد (اختياري)</label><textarea id="qd" className="input min-h-20" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} maxLength={2000} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="qp">نسبة النجاح %</label><input id="qp" type="number" min={0} max={100} className="input" value={meta.pass_score} onChange={(e) => setMeta({ ...meta, pass_score: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="qn">نقاط النجاح</label><input id="qn" type="number" min={0} max={100} className="input" value={meta.points} onChange={(e) => setMeta({ ...meta, points: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-ink">
            <input type="checkbox" className="size-4 accent-[#003692]" checked={meta.published} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} />ظاهر للأعضاء
          </label>
        </div>
      </div>

      <ol className="space-y-4 px-6">
        {items.map((d, i) => (
          <li key={d.id ?? i} className="rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="font-bold text-brand tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div className="inline-flex rounded-md border border-line bg-white p-0.5" role="radiogroup" aria-label="نوع السؤال">
                {(Object.keys(KIND_LABEL) as QuestionKind[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={d.kind === k}
                    onClick={() => update(i, { kind: k, correct: k === 'single' ? d.correct.slice(0, 1) : d.correct })}
                    className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-semibold transition-colors ${d.kind === k ? 'bg-brand text-white' : 'text-muted hover:text-brand'}`}>{KIND_LABEL[k]}</button>
                ))}
              </div>
              <span className="ms-auto flex gap-0.5">
                <button type="button" className="btn-quiet !p-1.5" aria-label="تحريك للأعلى" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></button>
                <button type="button" className="btn-quiet !p-1.5" aria-label="تحريك للأسفل" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></button>
                <button type="button" className="btn-danger !p-1.5" aria-label="حذف السؤال" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
              </span>
            </div>
            <div className="space-y-3 p-4">
              <textarea className="input min-h-16" placeholder="نص السؤال" value={d.prompt} onChange={(e) => update(i, { prompt: e.target.value })} required maxLength={1000} aria-label={`نص السؤال ${i + 1}`} />
              {d.kind !== 'text' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">{d.kind === 'single' ? 'حدد الإجابة الصحيحة بالضغط على الدائرة' : 'حدد كل الإجابات الصحيحة'}</p>
                  {d.options.map((o, oi) => {
                    const on = d.correct.includes(o.id)
                    return (
                      <div key={o.id} className="flex items-center gap-2">
                        <button type="button" role={d.kind === 'single' ? 'radio' : 'checkbox'} aria-checked={on} aria-label={`الخيار ${LETTERS[oi]} صحيح`}
                          onClick={() => update(i, { correct: d.kind === 'single' ? [o.id] : on ? d.correct.filter((c) => c !== o.id) : [...d.correct, o.id] })}
                          className={`grid size-8 shrink-0 cursor-pointer place-items-center border-2 text-sm font-bold transition-colors ${d.kind === 'single' ? 'rounded-full' : 'rounded-[4px]'} ${on ? 'border-mint bg-mint text-white' : 'border-line text-peri hover:border-mint'}`}>
                          {on ? <Check className="size-4" strokeWidth={3} /> : LETTERS[oi]}
                        </button>
                        <input className="input" placeholder={`الخيار ${LETTERS[oi] ?? oi + 1}`} value={o.text} maxLength={300}
                          onChange={(e) => update(i, { options: d.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                        <button type="button" className="btn-quiet !p-1.5" aria-label="حذف الخيار" disabled={d.options.length <= 2}
                          onClick={() => update(i, { options: d.options.filter((x) => x.id !== o.id), correct: d.correct.filter((c) => c !== o.id) })}><X className="size-4" /></button>
                      </div>
                    )
                  })}
                  {d.options.length < 8 && (
                    <button type="button" className="btn-quiet text-xs" onClick={() => update(i, { options: [...d.options, { id: newId(), text: '' }] })}><Plus className="size-3.5" />خيار</button>
                  )}
                </div>
              )}
              <input className="input text-sm" placeholder={d.kind === 'text' ? 'ملاحظة تظهر بعد الإرسال (اختياري)' : 'توضيح يظهر بعد الإجابة (اختياري)'}
                value={d.explanation} onChange={(e) => update(i, { explanation: e.target.value })} maxLength={2000} aria-label="توضيح" />
            </div>
          </li>
        ))}
      </ol>

      <div className="space-y-3 p-6">
        <button type="button" className="btn-ghost w-full" onClick={() => setItems([...items, blankQuestion()])}><Plus className="size-4" />سؤال جديد</button>
        <ErrorNote error={save.error ?? keys.error} />
        <div className="flex gap-2">
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'جار الحفظ...' : 'حفظ الاختبار'}</button>
          <button type="button" className="btn-ghost" onClick={onDone}>إلغاء</button>
        </div>
      </div>
    </form>
  )
}
