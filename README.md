# مجتمع وثيق · Watheeq Community

ميثاق الأسرة الواعية. An Arabic-first community platform for parents: discussions, a course library, live sessions, levels and a leaderboard.

**Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Supabase (Postgres + Auth + Storage, RLS on every table).

## Setup

```bash
npm install
cp .env.example .env   # fill in the Supabase values
npm run dev
```

## Database

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies `supabase/migrations/*.sql` in order (tracked in `private.migrations`) |
| `npm run db:test` | Runs the RLS test suite inside a rolled-back transaction |
| `npm run db:seed` | Adds demo members, courses, posts and sessions |
| `npm run db:seed -- --clean` | Removes everything the seed added (do this before launch) |

The first account to sign up becomes the community owner.

## Brand

Colors, logo, pattern band and outline vectors come from the official identity (`src/brand/paths.ts`, `src/components/brand.tsx`): navy `#003692`, mint `#70c997`, cloud `#f2f5f9`, periwinkle `#8faad1`, set in IBM Plex Sans Arabic.

## Deploy

Static SPA (`vercel.json` rewrites every route to `index.html`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment.
