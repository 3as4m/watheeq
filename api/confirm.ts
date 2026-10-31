// POST /api/confirm { sessionId } with the user's JWT, called when Stripe redirects back.
// Grants access right away instead of waiting for the webhook (both paths are idempotent).
import { db, fulfillSession, json, stripe } from './_shared.js'

export async function POST(request: Request) {
  const jwt = request.headers.get('authorization')?.replace(/^Bearer /, '')
  const { data: auth } = jwt ? await db(jwt).auth.getUser(jwt) : { data: { user: null } }
  if (!auth.user) return json({ error: 'سجل الدخول أولا' }, 401)
  const { sessionId } = (await request.json().catch(() => ({}))) as { sessionId?: string }
  if (!sessionId?.startsWith('cs_')) return json({ error: 'invalid session' }, 400)
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.user_id !== auth.user.id) return json({ error: 'not your session' }, 403)
  return json({ granted: await fulfillSession(session) })
}
