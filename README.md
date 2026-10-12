# مجتمع وثيق · Watheeq Community

ميثاق الأسرة الواعية. An Arabic-first platform for running many parenting communities: discussions, a course library with lesson quizzes, live sessions with attendance, levels and a leaderboard, plus a platform dashboard with per-participant analytics.

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
| `npm run db:seed -- --extras` | Adds demo quizzes, quiz attempts and attendance to an existing seed |
| `npm run db:seed -- --clean` | Removes everything the seed added (do this before launch) |
| `npm run db:admin -- <email> [name]` | Creates or resets a confirmed platform admin account and prints its password |

## Platform model

- **Communities** live at `/c/<slug>`. Platform admins create them from `/admin`; each has an invite link (`/join/<code>`) and can be public (listed in the directory) or private (invite or admin-added only).
- **Roles** are per community (`owner`, `admin`, `moderator`, `member`). Platform admins (`public.platform_admins`) act as admin in every community.
- **Quizzes** attach to a lesson. Answer keys sit in a staff-only table and grading runs in `submit_quiz()`, so members never receive the answers in advance. Open-ended (reflection) questions are stored for staff and ungraded.
- **Attendance** for each live session is marked by staff on the session page, or by members checking in from 15 minutes before the start until 30 minutes after the end. Attending earns 3 points, and passing a quiz the first time earns the quiz's points.
- **Analytics**: `member_analytics(cid)` returns one row per participant (activity, lessons, quiz scores, attendance rate). It drives the community admin page and the CSV export.

## Brand

Colors, logo, pattern band and outline vectors come from the official identity (`src/brand/paths.ts`, `src/components/brand.tsx`): navy `#003692`, mint `#70c997`, cloud `#f2f5f9`, periwinkle `#8faad1`, set in IBM Plex Sans Arabic.

## Deploy

Static SPA (`vercel.json` rewrites every route to `index.html`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment.
