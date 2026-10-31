// End-to-end check of api/stripe-webhook.ts against the real database, with locally signed events.
// Needs no Stripe key: signatures are made with a throwaway webhook secret. Cleans up after itself.
//   npx tsx scripts/payments-test.ts
import 'dotenv/config'
import Stripe from 'stripe'
import { dbClient } from './db.mjs'

const pg = dbClient()
await pg.connect()
process.env.STRIPE_SECRET_KEY ||= 'sk_test_unused'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_test'
process.env.PAYMENTS_RPC_SECRET = (await pg.query(`select value from private.settings where key = 'payments_secret'`)).rows[0].value
const { POST } = await import('../api/stripe-webhook.ts')

let pass = 0, fail = 0
const ok = (name: string, cond: boolean) => { cond ? pass++ : fail++; console.log(cond ? 'PASS' : 'FAIL', name) }
const send = async (event: object, sig?: string) => {
  const payload = JSON.stringify(event)
  const header = sig ?? Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_local_test' })
  return POST(new Request('http://local/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }))
}
const session = (id: string, mode: string, sub: string | null) => ({
  id: 'evt_' + id, object: 'event', type: 'checkout.session.completed',
  data: { object: { id, object: 'checkout.session', mode, payment_status: 'paid', amount_total: 4900, currency: 'sar', subscription: sub, metadata: { user_id: user, community_id: cid } } },
})

const user = (await pg.query(`select user_id from public.members m join auth.users u on u.id = m.user_id where u.email like 'demo-%' limit 1`)).rows[0].user_id
const cid = (await pg.query(`insert into public.communities (slug, name, price_amount, price_interval) values ('pay-test', 'Pay test', 4900, 'month') returning id`)).rows[0].id
const member = async () => (await pg.query('select stripe_subscription_id from public.members where community_id = $1 and user_id = $2', [cid, user])).rows[0]
try {
  ok('bad signature rejected', (await send(session('cs_test_bad', 'payment', null), 't=1,v1=deadbeef')).status === 400)
  ok('nothing granted on bad signature', !(await member()))

  ok('checkout.session.completed accepted', (await send(session('cs_test_sub', 'subscription', 'sub_test_1'))).status === 200)
  ok('membership granted with subscription id', (await member())?.stripe_subscription_id === 'sub_test_1')
  await send(session('cs_test_sub', 'subscription', 'sub_test_1'))
  ok('replayed event records one payment', (await pg.query(`select count(*)::int n from public.payments where stripe_ref = 'cs_test_sub'`)).rows[0].n === 1)

  await send({ id: 'evt_inv', object: 'event', type: 'invoice.paid', data: { object: { id: 'in_test_1', object: 'invoice', billing_reason: 'subscription_cycle', amount_paid: 4900, currency: 'sar',
    parent: { subscription_details: { subscription: 'sub_test_1', metadata: { user_id: user, community_id: cid } } } } } })
  ok('renewal recorded', (await pg.query(`select kind from public.payments where stripe_ref = 'in_test_1'`)).rows[0]?.kind === 'renewal')

  await send({ id: 'evt_del', object: 'event', type: 'customer.subscription.deleted', data: { object: { id: 'sub_test_1', object: 'subscription' } } })
  ok('cancelled subscription removes access', !(await member()))

  await send(session('cs_test_once', 'payment', null))
  ok('one-time payment grants access', !!(await member()))

  const { createClient } = await import('@supabase/supabase-js')
  const anon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!)
  const forged = await anon.rpc('payments_fulfill', { p_secret: 'guess', p_ref: 'cs_forged', p_user: user, p_community: cid, p_amount: 1, p_currency: 'sar', p_kind: 'one_time' })
  ok('fulfil RPC refuses a wrong secret', !!forged.error)
  ok('anon cannot read payments', !!(await anon.from('payments').select('id').limit(1)).error)
} catch (e) {
  console.error('ERROR', e); fail++
} finally {
  await pg.query(`delete from public.payments where community_id = $1 or stripe_ref like 'cs_test_%' or stripe_ref = 'in_test_1'`, [cid])
  await pg.query('delete from public.communities where id = $1', [cid])
  await pg.end()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
