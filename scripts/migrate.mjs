// Applies supabase/migrations/*.sql in order, once each. Usage: npm run db:migrate
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ref = process.env.SUPABASE_PROJECT_REF
const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const dir = path.resolve('supabase/migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

await client.connect()
await client.query(`create schema if not exists private;
  create table if not exists private.migrations (name text primary key, applied_at timestamptz not null default now());`)
const done = new Set((await client.query('select name from private.migrations')).rows.map((r) => r.name))

for (const f of files) {
  if (done.has(f)) continue
  console.log('applying', f)
  try {
    await client.query('begin')
    await client.query(fs.readFileSync(path.join(dir, f), 'utf8'))
    await client.query('insert into private.migrations (name) values ($1)', [f])
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    console.error('FAILED', f, '-', e.message)
    process.exitCode = 1
    break
  }
}
await client.end()
console.log('done')
