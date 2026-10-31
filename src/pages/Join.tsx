import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Lock, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogoHorizontal, Mark, OutlineMark, PatternBand } from '../components/brand'
import { ErrorNote, Spinner } from '../components/ui'
import { PENDING_INVITE_KEY, useAuth, writeStore } from '../lib/auth'
import { confirmCheckout, priceLabel, startCheckout } from '../lib/payments'
import { supabase } from '../lib/supabase'
import type { Community, Currency, PriceInterval } from '../lib/types'
import { formatNumber } from '../lib/utils'

interface Preview {
  id: string; slug: string; name: string; tagline: string | null; about: string | null; member_count: number
  price_amount: number | null; price_currency: Currency; price_interval: PriceInterval | null
}

/** Full-page invitation card, styled like the identity cover. */
function InviteCard({ name, tagline, about, members, price, children }: { name: string; tagline?: string | null; about?: string | null; members?: number; price?: string | null; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <OutlineMark className="absolute -start-[30%] top-[-10%] hidden w-[70%] lg:block" opacity={0.22} />
      <header className="relative mx-auto flex w-full max-w-5xl items-center px-4 pt-6 sm:px-6">
        <Link to="/" aria-label="مجتمع وثيق" className="text-[40px]"><LogoHorizontal /></Link>
      </header>
      <main className="relative mx-auto grid w-full max-w-5xl flex-1 place-items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg animate-rise overflow-hidden rounded-lg border border-line bg-white">
          <div className="relative overflow-hidden bg-brand px-7 pb-8 pt-9 text-white">
            <OutlineMark className="absolute -bottom-1/3 -end-[12%] w-[75%]" color="#ffffff" opacity={0.14} />
            <Mark tone="white" className="relative w-20" />
            <p className="relative mt-6 text-sm font-medium text-mint">دعوة للانضمام</p>
            <h1 className="relative mt-1 text-3xl font-bold leading-tight">{name}</h1>
            {tagline && <p className="relative mt-1 text-white/75">{tagline}</p>}
            {price && <p className="relative mt-4 inline-flex items-center gap-2 rounded-[3px] bg-mint px-2.5 py-1 text-sm font-bold text-brand-dark"><CreditCard className="size-4" />{price}</p>}
          </div>
          <PatternBand className="h-8" />
          <div className="space-y-5 p-7">
            {about && <p className="leading-relaxed text-ink/85">{about}</p>}
            {members !== undefined && (
              <p className="flex items-center gap-2 text-sm text-muted"><Users className="size-4" />{formatNumber(members)} عضو</p>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

/** /join/<code>: preview for visitors, instant join for signed-in members. */
export default function Join() {
  const { code = '' } = useParams()
  const { session, refresh } = useAuth()
  const nav = useNavigate()
  const started = useRef(false)

  const preview = useQuery({
    queryKey: ['invite', code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_by_invite', { p_code: code })
      if (error) throw error
      return (data as Preview[])[0] ?? null
    },
  })

  const join = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('join_community', { p_code: code })
      if (error) throw error
      return data as string
    },
    onSuccess: async (slug) => { writeStore(PENDING_INVITE_KEY, null); await refresh(); nav(`/c/${slug}`, { replace: true }) },
    onError: () => writeStore(PENDING_INVITE_KEY, null),
  })

  const pay = useMutation({
    mutationFn: () => startCheckout(preview.data!.id, code),
    onMutate: () => writeStore(PENDING_INVITE_KEY, null),
  })
  const paid = preview.data?.price_amount != null

  // Remember the invite through signup/email confirmation; free communities are joined straight away.
  useEffect(() => {
    if (!preview.data) return
    if (!session) writeStore(PENDING_INVITE_KEY, code)
    else if (!paid && !started.current) { started.current = true; join.mutate() }
  }, [preview.data, session, code, join, paid])

  if (preview.isLoading || (session && preview.data && !paid && !join.isError)) return <Spinner label="جار الانضمام" />
  if (!preview.data) {
    return (
      <InviteCard name="رابط غير صالح" tagline="ربما انتهت صلاحية الدعوة أو تغير الرابط.">
        <Link to="/" className="btn-primary w-full">العودة للرئيسية</Link>
      </InviteCard>
    )
  }
  const p = preview.data
  return (
    <InviteCard name={p.name} tagline={p.tagline} about={p.about} members={p.member_count} price={priceLabel(p)}>
      <ErrorNote error={join.error ?? pay.error} />
      {session ? (
        paid ? (
          <button className="btn-primary btn-lg w-full" onClick={() => pay.mutate()} disabled={pay.isPending}>
            <CreditCard className="size-4" />{pay.isPending ? 'جار التحويل للدفع...' : 'ادفع وانضم'}
          </button>
        ) : (
          <button className="btn-primary btn-lg w-full" onClick={() => join.mutate()} disabled={join.isPending}>انضم الآن<ArrowLeft className="size-4" /></button>
        )
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/signup" className="btn-primary btn-lg">{paid ? 'أنشئ حسابك أولا' : 'إنشاء حساب والانضمام'}</Link>
          <Link to="/login" className="btn-ghost btn-lg">لدي حساب</Link>
        </div>
      )}
    </InviteCard>
  )
}

/** Shown when a signed-in user opens a community they are not part of. */
export function JoinPrompt({ community }: { community: Community }) {
  const { refresh } = useAuth()
  const price = priceLabel(community)
  const pay = useMutation({ mutationFn: () => startCheckout(community.id) })
  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('join_community', { cid: community.id })
      if (error) throw error
    },
    onSuccess: () => refresh(),
  })
  return (
    <InviteCard name={community.name} tagline={community.tagline} about={community.about} price={price}>
      <ErrorNote error={join.error ?? pay.error} />
      {price && !community.is_private ? (
        <button className="btn-primary btn-lg w-full" onClick={() => pay.mutate()} disabled={pay.isPending}>
          <CreditCard className="size-4" />{pay.isPending ? 'جار التحويل للدفع...' : `اشترك الآن: ${price}`}
        </button>
      ) : community.is_private ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Lock className="size-4" />هذا مجتمع خاص، تحتاج إلى رابط دعوة من إدارته.</p>
      ) : (
        <button className="btn-primary btn-lg w-full" onClick={() => join.mutate()} disabled={join.isPending}>انضم إلى المجتمع<ArrowLeft className="size-4" /></button>
      )}
      <Link to="/communities" className="btn-quiet w-full">كل المجتمعات</Link>
    </InviteCard>
  )
}

/** Stripe sends buyers back here; confirm the session, then open the community. */
export function CheckoutDone() {
  const [sp] = useSearchParams()
  const { refresh } = useAuth()
  const nav = useNavigate()
  const sessionId = sp.get('session_id') ?? ''
  const slug = sp.get('c') ?? ''
  const sent = useRef(false)
  const confirm = useMutation({
    mutationFn: () => confirmCheckout(sessionId),
    onSuccess: async () => { await refresh(); nav(`/c/${slug}`, { replace: true }) },
  })
  useEffect(() => {
    if (!sent.current && sessionId) { sent.current = true; confirm.mutate() }
  }, [sessionId, confirm])

  if (!confirm.isError && sessionId) return <Spinner label="جار تأكيد الدفع" />
  return (
    <InviteCard name="لم نتمكن من تأكيد الدفع" tagline="إن خُصم المبلغ فسيُفعّل اشتراكك تلقائيًا خلال دقائق.">
      <ErrorNote error={confirm.error} />
      <Link to={slug ? `/c/${slug}` : '/'} className="btn-primary w-full">المتابعة</Link>
    </InviteCard>
  )
}
