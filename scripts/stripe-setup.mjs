// One-time Stripe setup. Put STRIPE_SECRET_KEY=sk_live_... in .env yourself, then run:
//   npm run stripe:setup
// It checks the account, registers the webhook for https://www.watheaq.com/api/stripe-webhook,
// and writes STRIPE_WEBHOOK_SECRET and PAYMENTS_RPC_SECRET into .env. Secrets are never printed.
import 'dotenv/config'
import fs from 'node:fs'
import Stripe from 'stripe'
import { dbClient } from './db.mjs'

const SITE = process.env.SITE_URL || 'https://www.watheaq.com'
const URL_ = `${SITE}/api/stripe-webhook`
const EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'invoice.paid', 'customer.subscription.deleted']

const key = process.env.STRIPE_SECRET_KEY
if (!key?.startsWith('sk_')) { console.error('Add STRIPE_SECRET_KEY=sk_... to .env first'); process.exit(1) }
const stripe = new Stripe(key)

const setEnv = (name, value) => {
  const text = fs.readFileSync('.env', 'utf8')
  const line = `${name}=${value}`
  fs.writeFileSync('.env', text.match(new RegExp(`^${name}=.*$`, 'm')) ? text.replace(new RegExp(`^${name}=.*$`, 'm'), line) : `${text.trimEnd()}\n${line}\n`)
}

const acct = await stripe.accounts.retrieve()
console.log(`account: ${acct.settings?.dashboard?.display_name ?? acct.id}  country: ${acct.country}  currency: ${acct.default_currency}`)
console.log(`charges enabled: ${acct.charges_enabled}  payouts enabled: ${acct.payouts_enabled}  mode: ${key.startsWith('sk_live') ? 'LIVE' : 'test'}`)

const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === URL_)
if (existing) await stripe.webhookEndpoints.del(existing.id) // a signing secret is only shown at creation, so recreate
const hook = await stripe.webhookEndpoints.create({ url: URL_, enabled_events: EVENTS, description: 'Watheeq community access' })
setEnv('STRIPE_WEBHOOK_SECRET', hook.secret)
console.log(`webhook ${existing ? 're' : ''}registered: ${URL_}`)

const pg = dbClient()
await pg.connect()
setEnv('PAYMENTS_RPC_SECRET', (await pg.query(`select value from private.settings where key = 'payments_secret'`)).rows[0].value)
await pg.end()

console.log('\nSaved to .env. Copy these three from .env into Vercel (Settings > Environment Variables), then redeploy:')
console.log('  STRIPE_SECRET_KEY\n  STRIPE_WEBHOOK_SECRET\n  PAYMENTS_RPC_SECRET')
