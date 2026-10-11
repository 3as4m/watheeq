import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogoHorizontal, OutlineMark, PatternBand } from '../components/brand'
import { ErrorNote } from '../components/ui'
import { supabase } from '../lib/supabase'

/** Sign in / sign up, laid out like the identity cover (PDF page 1). */
export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const signup = mode === 'signup'

  const submit = useMutation({
    mutationFn: async () => {
      setNotice('')
      if (!signup) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : error.message)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setNotice('أرسلنا رابط التفعيل إلى بريدك الإلكتروني. افتحه ثم سجل الدخول.')
      }
    },
  })

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit.mutate() }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <OutlineMark className="absolute -start-[42%] top-[-6%] hidden w-[78%] lg:block" color="#003692" opacity={0.28} />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <Link to="/" aria-label="الصفحة الرئيسية" className="text-[42px]"><LogoHorizontal /></Link>
        <span className="kicker hidden sm:block">ميثاق الأسرة الواعية</span>
      </header>

      <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className="animate-rise lg:order-1">
          <h1 className="text-[clamp(3rem,8vw,5.4rem)] font-bold leading-[1.1] text-brand">مجتمع وثيق</h1>
          <p className="mt-3 text-[clamp(1.5rem,3.4vw,2.3rem)] font-medium text-brand">ميثـــاق الأســـرة الواعيـــة</p>
          <p className="mt-1 text-[clamp(1.4rem,3vw,2.2rem)] text-mint" dir="ltr" style={{ textAlign: 'right' }}>Watheeq Community</p>
          <p className="mt-6 hidden max-w-md text-lg text-muted lg:block">
            مساحة تربوية آمنة لأولياء الأمور: دروس منظمة، ولقاءات مباشرة، ونقاشات مع أسر تشاركك الطريق نفسه.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card w-full max-w-md animate-rise justify-self-center p-6 [animation-delay:150ms] shadow-[0_24px_60px_-34px_rgba(0,38,109,0.35)] sm:p-8 lg:order-2 lg:justify-self-end">
          <h2 className="border-s-4 border-mint ps-3 text-2xl font-bold text-brand">{signup ? 'انضم إلى المجتمع' : 'تسجيل الدخول'}</h2>
          <p className="mt-2 text-sm text-muted">{signup ? 'أنشئ حسابك وابدأ رحلتك مع وثيق.' : 'أهلًا بعودتك.'}</p>

          <div className="mt-7 space-y-4">
            {signup && (
              <div>
                <label className="label" htmlFor="name">الاسم</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">البريد الإلكتروني</label>
              <input id="email" type="email" dir="ltr" className="input text-start" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">كلمة المرور</label>
              <input id="password" type="password" dir="ltr" className="input text-start" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} />
              {signup && <p className="mt-1 text-xs text-muted">8 أحرف على الأقل</p>}
            </div>

            <ErrorNote error={submit.error} />
            {notice && <p role="status" className="rounded-md bg-mint-soft px-3.5 py-2.5 text-sm text-mint-deep">{notice}</p>}

            <button className="btn-primary btn-lg w-full" disabled={submit.isPending}>
              {submit.isPending ? 'لحظة...' : signup ? 'إنشاء الحساب' : 'دخول'}
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            {signup ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
            <Link to={signup ? '/login' : '/signup'} className="font-semibold text-brand hover:underline">{signup ? 'سجل الدخول' : 'انضم الآن'}</Link>
          </p>
        </form>
      </main>

      <footer className="relative mx-auto flex w-full max-w-6xl flex-wrap items-end gap-x-10 gap-y-3 px-4 pb-6 text-xs text-peri sm:px-6">
        <div><p>اسم المشروع</p><p className="font-semibold">مجتمع وثيق</p></div>
        <div><p>الحقوق</p><p className="font-semibold">محفوظة لمجتمع وثيق</p></div>
        <span className="ms-auto text-sm font-light tracking-[0.12em]" dir="ltr">1447 - 2026</span>
      </footer>
      <PatternBand className="relative h-10" animated />
    </div>
  )
}
