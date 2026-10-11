import { ArrowLeft, BookOpen, CalendarDays, MessagesSquare, Plus, Trophy, Users } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import Intro from '../components/Intro'
import { AccentHeading, Leaf, LogoHorizontal, LogoStacked, Mark, OutlineMark, PatternBand, SectionMeta } from '../components/brand'
import { useAuth } from '../lib/auth'
import { useReveal } from '../lib/useReveal'

const anchors = [
  { href: '#about', label: 'عن وثيق' },
  { href: '#offer', label: 'ماذا نقدّم' },
  { href: '#pillars', label: 'ركائزنا' },
  { href: '#join', label: 'كيف تنضم' },
  { href: '#faq', label: 'الأسئلة' },
]

const offers = [
  { n: '01', icon: MessagesSquare, title: 'نقاشات المجتمع', body: 'اطرح موقفًا تربويًا يشغلك، واستفد من تجارب أسر تمر بما تمر به، ومن توجيه المشرفين والمختصين.' },
  { n: '02', icon: BookOpen, title: 'المكتبة التربوية', body: 'دورات ودروس مسجلة مرتبة في وحدات، تتابع فيها تقدمك درسًا بعد درس وتعود إليها متى شئت.' },
  { n: '03', icon: CalendarDays, title: 'اللقاءات المباشرة', body: 'لقاءات دورية مع المختصين تجدها في تقويم المجتمع، تؤكد حضورك وتصلك تفاصيل كل لقاء.' },
  { n: '04', icon: Trophy, title: 'المستويات والصدارة', body: 'كل مشاركة نافعة تمنحك نقاطًا ترفع مستواك وتفتح لك دورات أعمق في المكتبة.' },
  { n: '05', icon: Users, title: 'أسر تشاركك الطريق', body: 'دليل للأعضاء تتعرف فيه على آباء وأمهات يشاركونك الاهتمام نفسه والمرحلة العمرية نفسها.' },
]

const pillars = [
  { word: 'عقل', title: 'وعي تربوي', body: 'فهم مراحل نمو الطفل واحتياجات كل مرحلة، وبناء التفكير السليم والقدرة على الاختيار.', cls: 'bg-mint text-brand', big: 'text-white' },
  { word: 'نفس', title: 'استقرار نفسي', body: 'علاقة آمنة داخل البيت، واحتواء للمشاعر، وحوار يبني الثقة بدل الخوف.', cls: 'bg-brand text-white', big: 'text-white' },
  { word: 'جسد', title: 'عادات وسلوك', body: 'رعاية الجسد بالحركة والغذاء والنوم، وعادات يومية تصنع الانضباط والمسؤولية.', cls: 'bg-white text-brand', big: 'text-brand' },
]

const steps = [
  { n: '01', title: 'أنشئ حسابك', body: 'بالاسم والبريد الإلكتروني، في أقل من دقيقة.' },
  { n: '02', title: 'عرّف بنفسك', body: 'أضف صورتك ونبذة قصيرة ليتعرف عليك أعضاء المجتمع.' },
  { n: '03', title: 'ابدأ رحلتك', body: 'شارك في أول نقاش، وابدأ أول دورة في المكتبة التربوية.' },
]

const faqs = [
  { q: 'ما هو مجتمع وثيق؟', a: 'مجتمع تربوي على الإنترنت لأولياء الأمور، يجمع الدروس المنظمة واللقاءات المباشرة والنقاشات في مكان واحد، ضمن بيئة آمنة تجمع بين أصالة القيم وحداثة العلم.' },
  { q: 'لمن هذا المجتمع؟', a: 'للآباء والأمهات والمربين، ولكل من يريد أن يربي أبناءه على وعي، أيًا كانت المرحلة العمرية التي يمر بها أبناؤه.' },
  { q: 'كيف تُفتح الدورات المتقدمة؟', a: 'بعض الدورات مرتبطة بمستوى معين. يرتفع مستواك بالمشاركة النافعة: كل إعجاب يصل إلى منشورك أو تعليقك يمنحك نقطة.' },
  { q: 'من يرى ما أكتبه؟', a: 'محتوى المجتمع لا يراه إلا أعضاؤه، ولا يظهر بريدك الإلكتروني لأي عضو آخر.' },
  { q: 'هل أستطيع المشاركة من الجوال؟', a: 'نعم، الموقع مصمم ليعمل على الجوال كما يعمل على الحاسوب، دون الحاجة إلى تثبيت أي تطبيق.' },
]

const INTRO_KEY = 'watheeq-intro-seen'

function shouldPlayIntro() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (window.location.hash) return false
  try { return !sessionStorage.getItem(INTRO_KEY) } catch { return true }
}

export default function Landing() {
  const { session } = useAuth()
  useReveal()
  const [intro, setIntro] = useState<'show' | 'out' | 'gone'>(() => (shouldPlayIntro() ? 'show' : 'gone'))
  const [go, setGo] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    if (intro === 'gone') {
      // No intro: still play the hero choreography, on the next frame so transitions run.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)))
      return () => cancelAnimationFrame(id)
    }
    if (intro === 'show') {
      try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* private mode */ }
      document.documentElement.style.overflow = 'hidden'
      const t = setTimeout(() => setIntro('out'), 1900)
      return () => clearTimeout(t)
    }
    // 'out': curtain lifts while the hero plays underneath.
    document.documentElement.style.overflow = ''
    setGo(true)
    const t = setTimeout(() => setIntro('gone'), 1100)
    return () => clearTimeout(t)
  }, [intro])
  useEffect(() => () => { document.documentElement.style.overflow = '' }, [])

  const onPointer = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => { el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)) })
  }
  const resetPointer = () => { heroRef.current?.style.setProperty('--mx', '0'); heroRef.current?.style.setProperty('--my', '0') }
  const joinTo = session ? '/' : '/signup'
  const joinLabel = session ? 'ادخل إلى المجتمع' : 'انضم إلى المجتمع'

  return (
    <div className="overflow-x-clip">
      {intro !== 'gone' && <Intro out={intro === 'out'} onSkip={() => setIntro('out')} />}
      {/* Header */}
      <header className={`h-header sticky top-0 z-30 border-b border-line/80 bg-cloud/90 backdrop-blur ${go ? 'is-go' : ''}`}>
        <div className="mx-auto flex h-18 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/welcome" aria-label="مجتمع وثيق" className="shrink-0 text-[44px]"><LogoHorizontal /></Link>
          <nav className="hidden flex-1 justify-center gap-7 lg:flex" aria-label="أقسام الصفحة">
            {anchors.map((a) => <a key={a.href} href={a.href} className="text-sm font-medium text-muted transition-colors hover:text-brand">{a.label}</a>)}
          </nav>
          <div className="ms-auto flex items-center gap-2 lg:ms-0">
            {!session && <Link to="/login" className="btn hidden text-brand hover:bg-brand-soft sm:inline-flex">تسجيل الدخول</Link>}
            <Link to={joinTo} className="btn-primary">{session ? 'المجتمع' : 'انضم الآن'}</Link>
          </div>
        </div>
      </header>

      {/* Hero: PDF cover + the "نغرس قيما لنحصد جيلا" post. Choreographed by .hero.is-go (see index.css). */}
      <section className={`hero relative ${go ? 'is-go' : ''}`} onPointerMove={onPointer} onPointerLeave={resetPointer} ref={heroRef}>
        <div className="px-deep pointer-events-none absolute -start-[30%] top-[-12%] hidden w-[95%] lg:block">
          <OutlineMark draw className="w-full" color="#003692" opacity={0.22} />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="scroll-lift relative z-10">
            <p className="h-fade text-sm font-medium text-mint-deep sm:text-base" style={{ '--d': '100ms' } as CSSProperties}>
              وعي تربوي &nbsp;-&nbsp; استقرار نفسي &nbsp;-&nbsp; مهارات قيادية
            </p>
            <div className="relative mt-5 ps-4 sm:ps-6">
              <span className="h-bar" aria-hidden="true" />
              <h1 className="text-brand">
                <span className="h-mask text-[clamp(3.1rem,9vw,6.6rem)] font-bold leading-[1.08]"><span style={{ '--d': '180ms' } as CSSProperties}>نغـرس قيمًا</span></span>
                <span className="h-mask text-[clamp(2.7rem,8vw,5.8rem)] font-medium leading-[1.12]"><span style={{ '--d': '330ms' } as CSSProperties}>لنحصـد جيلًا</span></span>
              </h1>
            </div>
            <p className="h-fade mt-7 max-w-xl text-lg leading-relaxed text-ink/85" style={{ '--d': '600ms' } as CSSProperties}>
              <strong className="font-semibold text-brand">مجتمع وثيق</strong> مساحة تربوية آمنة لأولياء الأمور الذين يريدون أن يربّوا أبناءهم على وعي:
              دروس منظمة، ولقاءات مباشرة مع المختصين، ونقاشات مع أسر تشاركك الطريق نفسه.
            </p>
            <div className="h-fade mt-9 flex flex-wrap items-center gap-3" style={{ '--d': '760ms' } as CSSProperties}>
              <Link to={joinTo} className="btn-primary btn-lg">{joinLabel}<ArrowLeft className="size-4" /></Link>
              <a href="#offer" className="btn-ghost btn-lg">تعرّف على ما نقدّمه</a>
            </div>
          </div>

          <div className="scroll-sink relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="px-soft absolute -top-[9%] start-[-16%] w-[70%] lg:-top-[14%] lg:start-[-22%] lg:w-[80%]">
              <div className="h-leaf"><Leaf className="w-full animate-float" style={{ ['--r' as string]: '-18deg' }} /></div>
            </div>
            <figure className="h-photo frame relative overflow-hidden">
              <img src="/img/hands.jpg" alt="يد أب تمسك بيد طفله" className="aspect-[732/752] w-full object-cover" />
              <Mark className="absolute start-5 top-5 w-20 sm:w-24" />
            </figure>
            <div className="h-grow absolute -bottom-5 end-6 h-24 w-3 bg-mint sm:h-32" aria-hidden="true" />
          </div>
        </div>
      </section>

      <PatternBand className="h-14 sm:h-20" animated />

      {/* About: PDF page 3, logo philosophy */}
      <section id="about" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div data-reveal><SectionMeta label="عن مجتمع وثيق" n="01" /></div>
          <div data-reveal className="mt-14 grid items-center gap-12 lg:grid-cols-[1fr_auto_1.6fr] lg:gap-16">
            <LogoStacked className="mx-auto w-52 sm:w-64" />
            <span className="hidden h-full w-px bg-petrol/60 lg:block" aria-hidden="true" />
            <div className="space-y-7 text-lg leading-[2] text-brand">
              <p>
                <strong className="font-bold text-mint-deep">لماذا وثيق؟ </strong>
                الوثيق هو المتين المحكم، ومن هذا المعنى وُلد المجتمع: ميثاق بين أسر تريد أن تربّي على بصيرة،
                فتتعلم معًا وتتناصح وتثبت على الطريق. الروابط المتصلة في شعارنا هي الروابط الأسرية التي نسعى لبنائها،
                والانحناءات التي تشبه الحضن هي البيئة التربوية الآمنة التي نوفرها.
              </p>
              <p>
                <strong className="font-bold text-mint-deep">لمن هذا المجتمع؟ </strong>
                للآباء والأمهات والمربين الذين يريدون علاقة أعمق مع أبنائهم، وفهمًا أوضح لمراحل نموهم،
                وأدوات عملية لتحديات كل مرحلة. لا يهم من أين تبدأ، المهم أن تبدأ مع من يعينك.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section id="offer" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div data-reveal><SectionMeta label="ماذا نقدّم" n="02" /></div>
          <div data-reveal className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
            <h2 className="text-[clamp(2.4rem,6vw,4.4rem)] font-bold leading-[1.15] text-brand">
              كل ما تحتاجه<br /><span className="font-medium">في مكــان واحــد</span>
            </h2>
            <p className="max-w-xl text-lg text-muted lg:justify-self-end">
              بدل أن تتنقل بين المقاطع المتفرقة والمجموعات المزدحمة، يجمع وثيق المحتوى المنظم والصحبة الصالحة في منصة واحدة هادئة.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-6">
            {offers.map((o, i) => (
              <article key={o.n} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }} className={`group relative flex flex-col p-7 transition-colors sm:p-9 ${i < 2 ? 'md:col-span-3' : 'md:col-span-2'} ${i === 0 ? 'bg-brand text-white' : 'bg-white'}`}>
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-bold leading-none text-mint tabular-nums" dir="ltr">{o.n}</span>
                  <o.icon className={`size-6 ${i === 0 ? 'text-white/70' : 'text-peri'}`} strokeWidth={1.6} />
                </div>
                <h3 className={`mt-10 text-2xl font-bold ${i === 0 ? 'text-white' : 'text-brand'}`}>{o.title}</h3>
                <p className={`mt-3 leading-relaxed ${i === 0 ? 'text-white/80' : 'text-muted'}`}>{o.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars: PDF page 8 colour columns */}
      <section id="pillars" className="scroll-mt-20">
        <div className="grid lg:min-h-[640px] lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div data-reveal className="flex flex-col justify-center px-4 py-16 sm:px-10 lg:px-14">
            <p className="kicker">ركائز المنهج</p>
            <h2 className="mt-3 text-[clamp(2.6rem,5vw,4.2rem)] font-bold leading-[1.15] text-brand">ثلاث ركائز<br />لبناء الإنسان</h2>
            <p className="mt-5 max-w-sm text-lg text-muted">بيئة تربوية آمنة وملهمة، تجمع بين أصالة القيم وحداثة العلم، وتنظر إلى الطفل كاملًا.</p>
          </div>
          {pillars.map((p, i) => (
            <div key={p.word} data-reveal style={{ ['--d' as string]: `${i * 120}ms` }} className={`group relative flex flex-col overflow-hidden px-7 py-12 sm:px-10 lg:py-16 ${p.cls}`}>
              <h3 className="text-2xl font-bold">{p.title}</h3>
              <p className="mt-3 max-w-xs leading-relaxed opacity-85">{p.body}</p>
              <span aria-hidden="true"
                className={`mt-10 block text-[5.5rem] font-bold leading-none lg:mt-auto lg:self-center lg:text-[8.5rem] lg:[writing-mode:vertical-rl] lg:rotate-180 ${p.big}`}>
                {p.word}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Hadith post: PDF page 14, middle */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <figure data-reveal className="frame relative mx-auto max-w-3xl overflow-hidden">
          <OutlineMark className="absolute -end-24 -top-16 w-[70%]" color="#297289" opacity={0.25} />
          <blockquote className="relative px-6 pb-8 pt-12 text-center sm:px-12 sm:pt-16">
            <Mark className="mx-auto mb-8 w-24" />
            <p className="text-base text-peri">قـــال رســـول الله ﷺ:</p>
            <p className="mt-3 text-[clamp(1.6rem,4.2vw,2.6rem)] font-bold leading-[1.6] text-brand">
              كُلُّكُمْ رَاعٍ، وَكُلُّكُمْ مَسْؤُولٌ عَنْ رَعِيَّتِهِ
            </p>
            <figcaption className="mt-2 text-sm text-peri">(متفق عليه)</figcaption>
          </blockquote>
          <img src="/img/reading.jpg" alt="أب يقرأ القرآن مع ابنه في البيت" className="relative aspect-[900/518] w-full object-cover" loading="lazy" />
        </figure>
      </section>

      {/* How to join + member card: PDF page 11 */}
      <section id="join" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div data-reveal><SectionMeta label="كيف تنضم" n="03" /></div>
          <div data-reveal className="mt-14 grid items-center gap-16 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <AccentHeading>
                <h2 className="text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[1.15] text-brand">ثلاث خطوات<br /><span className="font-medium">وتصبح عضــوًا</span></h2>
              </AccentHeading>
              <ol className="mt-12 space-y-0">
                {steps.map((s) => (
                  <li key={s.n} className="grid grid-cols-[auto_1fr] gap-6 border-t border-line py-6 last:border-b">
                    <span className="text-3xl font-bold text-mint tabular-nums" dir="ltr">{s.n}</span>
                    <div>
                      <h3 className="text-xl font-bold text-brand">{s.title}</h3>
                      <p className="mt-1 text-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to={joinTo} className="btn-primary btn-lg mt-10">{joinLabel}<ArrowLeft className="size-4" /></Link>
            </div>
            <MemberCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div data-reveal><SectionMeta label="الأسئلة الشائعة" n="04" /></div>
          <div data-reveal className="mt-14 grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <h2 className="text-[clamp(2.4rem,5vw,3.8rem)] font-bold leading-[1.15] text-brand">أسئلة<br /><span className="font-medium">قبل الانضمام</span></h2>
            <div className="border-t border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-lg font-semibold text-brand [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="size-5 shrink-0 text-mint-deep transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="-mt-2 pb-6 leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final call: PDF page 15, "لا تنسى الانضمام" story */}
      <section className="relative overflow-hidden bg-brand text-white">
        <OutlineMark className="absolute -bottom-1/3 -end-[10%] w-[70%]" color="#ffffff" opacity={0.12} />
        <div className="absolute -start-6 top-[40%] w-28 sm:w-40"><Leaf className="w-full animate-float" style={{ ['--r' as string]: '200deg' }} /></div>
        <div className="absolute -end-4 top-[30%] w-24 sm:w-36"><Leaf className="w-full animate-float [animation-delay:-3s]" style={{ ['--r' as string]: '-60deg' }} /></div>
        <div data-reveal className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
          <h2 className="text-[clamp(2.8rem,8vw,5.6rem)] font-bold leading-[1.15]">لا تنســـى<br />الانضمـــام</h2>
          <p className="mt-4 text-xl text-peri sm:text-2xl">في مجتمع وثيق للتربية</p>
          <Link to={joinTo} className="btn-light btn-lg mt-10">{joinLabel}<ArrowLeft className="size-4" /></Link>
        </div>
      </section>

      <PatternBand className="h-12 sm:h-16" animated />

      {/* Footer: PDF cover colophon */}
      <footer className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <LogoStacked className="w-32" />
          </div>
          <dl className="grid grid-cols-2 gap-x-10 gap-y-5 text-sm text-peri sm:flex sm:gap-12">
            <div><dt>اسم المشروع</dt><dd className="font-semibold">مجتمع وثيق</dd></div>
            <div><dt>شعارنا</dt><dd className="font-semibold">ميثاق الأسرة الواعية</dd></div>
            <div><dt>الحقوق</dt><dd className="font-semibold">محفوظة لمجتمع وثيق</dd></div>
          </dl>
        </div>
        <div className="mt-12 flex items-center gap-5 text-peri">
          <span className="text-lg font-light tracking-[0.12em] tabular-nums" dir="ltr">1447 - 2026</span>
          <span className="h-px flex-1 bg-fog/70" />
          <Link to={session ? '/' : '/login'} className="text-sm font-medium hover:text-brand">{session ? 'المجتمع' : 'تسجيل الدخول'}</Link>
        </div>
      </footer>
    </div>
  )
}

/** The member ID card and its navy back, as on the lanyard mockup. */
function MemberCards() {
  return (
    <div className="relative mx-auto flex h-[440px] w-full max-w-sm items-center justify-center sm:h-[480px]" aria-hidden="true">
      <div className="absolute end-0 top-6 flex h-[360px] w-[240px] rotate-[7deg] flex-col items-center justify-center rounded-xl bg-brand shadow-[0_30px_60px_-30px_rgba(0,38,109,0.6)] sm:h-[390px] sm:w-[260px]">
        <span className="absolute top-5 size-6 rounded-full bg-cloud" />
        <LogoStacked tone="white" className="w-32" />
      </div>
      <div className="absolute start-0 top-0 flex h-[380px] w-[250px] -rotate-[4deg] flex-col overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-30px_rgba(0,38,109,0.45)] ring-1 ring-line sm:h-[410px] sm:w-[270px]">
        <span className="absolute inset-x-0 top-5 z-10 mx-auto size-6 rounded-full bg-cloud ring-1 ring-line" />
        <OutlineMark className="absolute -end-10 -top-6 w-[95%]" color="#297289" opacity={0.3} />
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-10 text-center">
          <div className="relative grid size-32 place-items-center">
            <span className="absolute inset-1 rotate-45 rounded-[0_50%_50%_50%] bg-brand" />
            <span className="relative grid size-[92px] place-items-center rounded-full bg-cloud text-4xl font-bold text-brand">أ</span>
          </div>
          <p className="mt-6 text-xl font-bold text-brand">اسمك هنا</p>
          <p className="mt-1 border-b border-mint pb-1 text-sm text-mint-deep">عضو في مجتمع وثيق</p>
        </div>
        <PatternBand className="h-12" framed={false} />
      </div>
    </div>
  )
}
