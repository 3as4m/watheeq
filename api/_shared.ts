// Shared by the payment functions. Files starting with "_" are not deployed as routes.
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

const url = process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

/** Publishable-key client, optionally acting as the signed-in user whose JWT we were given. */
export function db(jwt?: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  })
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Grants the membership a paid Checkout Session bought. Safe to call twice for the same session. */
export async function fulfillSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return false
  const { user_id, community_id } = session.metadata ?? {}
  if (!user_id || !community_id) return false
  const subscription = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
  const { error } = await db().rpc('payments_fulfill', {
    p_secret: process.env.PAYMENTS_RPC_SECRET,
    p_ref: session.id,
    p_user: user_id,
    p_community: community_id,
    p_amount: session.amount_total ?? 0,
    p_currency: session.currency ?? 'qar',
    p_kind: session.mode === 'subscription' ? 'subscription' : 'one_time',
    p_subscription: subscription,
  })
  if (error) throw new Error(error.message)
  return true
}
