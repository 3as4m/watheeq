// POST /api/stripe-webhook, called by Stripe. Verifies the signature, then:
//   checkout.session.completed / async_payment_succeeded -> grant membership + record payment
//   invoice.paid (renewals)                               -> record payment
//   customer.subscription.deleted                         -> remove the access it granted
import type Stripe from 'stripe'
import { db, fulfillSession, json, stripe } from './_shared.js'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature') ?? ''
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch {
    return json({ error: 'bad signature' }, 400)
  }
  const secret = process.env.PAYMENTS_RPC_SECRET

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await fulfillSession(event.data.object)
      break
    case 'invoice.paid': {
      const invoice = event.data.object
      if (invoice.billing_reason !== 'subscription_cycle') break // the first invoice is covered by checkout
      const sub = invoice.parent?.subscription_details
      const meta = sub?.metadata ?? {}
      if (!meta.user_id || !meta.community_id) break
      const subId = typeof sub?.subscription === 'string' ? sub.subscription : sub?.subscription?.id ?? null
      const { error } = await db().rpc('payments_fulfill', {
        p_secret: secret, p_ref: invoice.id, p_user: meta.user_id, p_community: meta.community_id,
        p_amount: invoice.amount_paid, p_currency: invoice.currency, p_kind: 'renewal', p_subscription: subId,
      })
      if (error) throw new Error(error.message)
      break
    }
    case 'customer.subscription.deleted': {
      const { error } = await db().rpc('payments_end_subscription', { p_secret: secret, p_subscription: event.data.object.id })
      if (error) throw new Error(error.message)
      break
    }
  }
  return json({ received: true })
}
