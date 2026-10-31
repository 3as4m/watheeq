// POST /api/checkout { communityId, inviteCode? } with the user's Supabase JWT.
// Creates a Stripe Checkout Session for the community's price and returns its URL.
import { db, json, stripe } from './_shared.js'

export async function POST(request: Request) {
  const jwt = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!jwt) return json({ error: 'سجل الدخول أولا' }, 401)
  const supabase = db(jwt)
  const { data: auth } = await supabase.auth.getUser(jwt)
  if (!auth.user) return json({ error: 'سجل الدخول أولا' }, 401)

  const { communityId, inviteCode } = (await request.json().catch(() => ({}))) as { communityId?: string; inviteCode?: string }
  if (!communityId) return json({ error: 'missing community' }, 400)
  const { data, error } = await supabase.rpc('community_for_checkout', { cid: communityId, p_code: inviteCode ?? null })
  if (error) return json({ error: error.message }, 400)
  const c = (data as { id: string; slug: string; name: string; price_amount: number; price_currency: string; price_interval: string }[])[0]
  if (!c) return json({ error: 'لا يوجد ما يمكن شراؤه، ربما أنت عضو بالفعل' }, 409)

  const origin = new URL(request.url).origin
  const recurring = c.price_interval === 'month' || c.price_interval === 'year'
  const metadata = { user_id: auth.user.id, community_id: c.id }
  const session = await stripe.checkout.sessions.create({
    mode: recurring ? 'subscription' : 'payment',
    customer_email: auth.user.email,
    client_reference_id: auth.user.id,
    locale: 'ar',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: c.price_currency,
        unit_amount: c.price_amount,
        product_data: { name: c.name },
        ...(recurring ? { recurring: { interval: c.price_interval as 'month' | 'year' } } : {}),
      },
    }],
    metadata,
    ...(recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    success_url: `${origin}/checkout/done?session_id={CHECKOUT_SESSION_ID}&c=${c.slug}`,
    cancel_url: inviteCode ? `${origin}/join/${inviteCode}` : `${origin}/c/${c.slug}`,
  })
  return json({ url: session.url })
}
