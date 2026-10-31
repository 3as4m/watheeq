import { supabase } from './supabase'
import type { Currency, PriceInterval } from './types'

const SYMBOL: Record<Currency, string> = { qar: 'ر.ق', sar: 'ر.س', usd: '$', aed: 'د.إ' }
export const CURRENCY_LABEL: Record<Currency, string> = { qar: 'ريال قطري', sar: 'ريال سعودي', usd: 'دولار أمريكي', aed: 'درهم إماراتي' }
export const INTERVAL_LABEL: Record<PriceInterval, string> = { one_time: 'دفعة واحدة', month: 'شهريًا', year: 'سنويًا' }

/** 4900 sar -> "49 ر.س"; amounts are stored in the currency's minor unit. */
export function money(amount: number, currency: Currency) {
  const n = (amount / 100).toLocaleString('ar-u-nu-latn', { maximumFractionDigits: 2 })
  return currency === 'usd' ? `${SYMBOL.usd}${n}` : `${n} ${SYMBOL[currency]}`
}

export function priceLabel(c: { price_amount: number | null; price_currency: Currency; price_interval: PriceInterval | null }) {
  if (c.price_amount === null || !c.price_interval) return null
  return `${money(c.price_amount, c.price_currency)} ${INTERVAL_LABEL[c.price_interval]}`
}

async function call(path: string, body: unknown) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error ?? 'تعذر الاتصال بخدمة الدفع')
  return out
}

/** Sends the browser to Stripe Checkout for this community. */
export async function startCheckout(communityId: string, inviteCode?: string) {
  const { url } = await call('/api/checkout', { communityId, inviteCode })
  window.location.assign(url)
}

/** After Stripe redirects back: grant access now rather than waiting for the webhook. */
export async function confirmCheckout(sessionId: string) {
  const { granted } = await call('/api/confirm', { sessionId })
  return granted as boolean
}
