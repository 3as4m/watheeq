// Creates (or resets) a confirmed email/password account and makes it a platform admin.
//   npm run db:admin -- admin@watheaq.com "اسم المدير"
// Prints a freshly generated password once. Running it again for the same email resets the password.
import crypto from 'node:crypto'
import { dbClient } from './db.mjs'

const email = (process.argv[2] ?? '').trim().toLowerCase()
const name = process.argv[3] ?? 'إدارة وثيق'
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('usage: npm run db:admin -- <email> [display name]')
  process.exit(1)
}
// No look-alike characters so it can be read off a screen.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const password = Array.from(crypto.randomBytes(18), (b) => alphabet[b % alphabet.length]).join('')

const c = dbClient()
await c.connect()
try {
  await c.query('begin')
  let id = (await c.query('select id from auth.users where lower(email) = $1', [email])).rows[0]?.id
  if (id) {
    await c.query(`update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
                   email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, updated_at = now() where id = $1`, [id, password])
  } else {
    id = (await c.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change_token_new, email_change)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
         extensions.crypt($2, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', $3::text), now(), now(), '', '', '', '')
       returning id`, [email, password, name])).rows[0].id
    await c.query(
      `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`, [id, email])
  }
  await c.query('insert into public.platform_admins (user_id) values ($1) on conflict do nothing', [id])
  await c.query('commit')
  console.log(`\nplatform admin ready\n  email:    ${email}\n  password: ${password}\n`)
} catch (e) {
  await c.query('rollback')
  console.error('FAILED', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}
