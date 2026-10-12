// Shared Postgres connection. Uses the IPv4 session pooler when SUPABASE_DB_HOST is set
// (the direct db.<ref>.supabase.co host is IPv6-only and not reachable from every network).
import 'dotenv/config'
import pg from 'pg'

export function dbClient() {
  const ref = process.env.SUPABASE_PROJECT_REF
  const pooler = process.env.SUPABASE_DB_HOST
  return new pg.Client({
    host: pooler || `db.${ref}.supabase.co`,
    port: 5432,
    user: pooler ? `postgres.${ref}` : 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  })
}
