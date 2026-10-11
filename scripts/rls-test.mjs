// Runs RLS/behaviour assertions inside a transaction that is always rolled back.
import 'dotenv/config'
import pg from 'pg'

const c = new pg.Client({ host: `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`, user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } })
await c.connect()
let pass = 0, fail = 0
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(cond ? 'PASS' : 'FAIL', name) }
const as = async (uid) => { await c.query('reset role'); await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]); await c.query('set local role authenticated') }
const asAnon = async () => { await c.query('reset role'); await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`); await c.query('set local role anon') }
const denied = async (sql, params = []) => { await c.query('savepoint s'); try { const r = await c.query(sql, params); await c.query('release savepoint s'); return r.rowCount === 0 ? 'zero' : 'allowed' } catch (e) { await c.query('rollback to savepoint s'); return 'error' } }

try {
  await c.query('begin')
  const A = (await c.query(`insert into auth.users (id,email,instance_id,aud,role) values (gen_random_uuid(),'owner-test@example.com','00000000-0000-0000-0000-000000000000','authenticated','authenticated') returning id`)).rows[0].id
  const B = (await c.query(`insert into auth.users (id,email,instance_id,aud,role) values (gen_random_uuid(),'member-test@example.com','00000000-0000-0000-0000-000000000000','authenticated','authenticated') returning id`)).rows[0].id
  const cid = (await c.query('select id from public.communities')).rows[0].id
  const roles = (await c.query('select user_id, role from public.members')).rows
  ok('first signup becomes owner', roles.find((r) => r.user_id === A)?.role === 'owner')
  ok('second signup is member', roles.find((r) => r.user_id === B)?.role === 'member')

  await asAnon()
  ok('anon cannot read posts', (await denied('select * from public.posts')) !== 'allowed')
  ok('anon cannot read profiles', (await denied('select * from public.profiles')) !== 'allowed')
  ok('anon cannot read members', (await denied('select * from public.members')) !== 'allowed')

  await as(B)
  const post = (await c.query(`insert into public.posts (community_id,title,body) values ($1,'t','b') returning id, author_id`, [cid])).rows[0]
  ok('member can post, author defaults to self', post.author_id === B)
  ok('cannot post as someone else', (await denied(`insert into public.posts (community_id,title,author_id) values ($1,'x',$2)`, [cid, A])) === 'error')
  ok('cannot self-pin via update', (await denied(`update public.posts set pinned=true where id=$1`, [post.id])) === 'error')
  ok('cannot tamper like_count', (await denied(`update public.posts set like_count=999 where id=$1`, [post.id])) === 'error')
  ok('cannot promote self', (await denied(`update public.members set role='admin' where user_id=$1`, [B])) !== 'allowed')
  ok('cannot raise own points', (await denied(`update public.members set points=9999 where user_id=$1`, [B])) === 'error')
  ok('member cannot create course', (await denied(`insert into public.courses (community_id,title) values ($1,'c')`, [cid])) === 'error')
  ok('member cannot create event', (await denied(`insert into public.events (community_id,title,starts_at) values ($1,'e',now())`, [cid])) === 'error')
  ok('member cannot call set_post_pinned', (await denied(`select public.set_post_pinned($1,true)`, [post.id])) === 'error')
  ok('member cannot call award_points', (await denied(`select public.award_points($1,$2,100,'x')`, [cid, B])) === 'error')
  ok('member cannot read point_log', (await denied('select * from public.point_log')) !== 'allowed')

  await as(A)
  await c.query(`insert into public.post_likes (post_id) values ($1)`, [post.id])
  await as(B)
  const me = (await c.query('select points from public.members where user_id=$1', [B])).rows[0]
  const pl = (await c.query('select like_count from public.posts where id=$1', [post.id])).rows[0]
  ok('like gives author 1 point', me.points === 1)
  ok('like_count incremented by trigger', pl.like_count === 1)
  await c.query(`insert into public.post_likes (post_id) values ($1)`, [post.id]).then(() => ok('self-like allowed, no self-points', true)).catch(() => ok('self-like', false))
  ok('points unchanged after self like', (await c.query('select points from public.members where user_id=$1', [B])).rows[0].points === 1)

  const cm = (await c.query(`insert into public.comments (post_id,body) values ($1,'hi') returning id`, [post.id])).rows[0]
  ok('comment_count via trigger', (await c.query('select comment_count from public.posts where id=$1', [post.id])).rows[0].comment_count === 1)
  const reply = (await c.query(`insert into public.comments (post_id,body,parent_id) values ($1,'r',$2) returning id`, [post.id, cm.id])).rows[0]
  ok('reply to comment works', !!reply.id)
  ok('nested reply (depth 2) rejected', (await denied(`insert into public.comments (post_id,body,parent_id) values ($1,'rr',$2)`, [post.id, reply.id])) === 'error')

  // staff powers
  await as(A)
  const course = (await c.query(`insert into public.courses (community_id,title,published,min_level) values ($1,'Course',true,3) returning id`, [cid])).rows[0]
  const mod = (await c.query(`insert into public.modules (course_id,title) values ($1,'M') returning id`, [course.id])).rows[0]
  const les = (await c.query(`insert into public.lessons (module_id,title,body) values ($1,'L','secret') returning id`, [mod.id])).rows[0]
  ok('owner can build course', !!les.id)
  await c.query(`select public.set_post_pinned($1,true)`, [post.id])
  ok('owner can pin', (await c.query('select pinned from public.posts where id=$1', [post.id])).rows[0].pinned === true)
  await c.query(`update public.members set role='moderator' where user_id=$1`, [B])
  ok('owner can change roles', (await c.query('select role from public.members where user_id=$1', [B])).rows[0].role === 'moderator')
  ok('owner role cannot be reassigned', (await denied(`update public.members set role='admin' where user_id=$1`, [A])) === 'error')
  await c.query(`update public.members set role='member' where user_id=$1`, [B])

  // level gating
  await as(B)
  ok('level-1 member sees course row', (await c.query('select 1 from public.courses where id=$1', [course.id])).rowCount === 1)
  ok('locked course hides modules', (await c.query('select 1 from public.modules where course_id=$1', [course.id])).rowCount === 0)
  ok('locked course hides lessons', (await c.query('select 1 from public.lessons where id=$1', [les.id])).rowCount === 0)
  ok('cannot mark locked lesson complete', (await denied(`insert into public.lesson_progress (lesson_id) values ($1)`, [les.id])) !== 'allowed')
  await c.query('reset role')
  await c.query(`update public.members set points=20 where user_id=$1`, [B]) // level 3
  await as(B)
  ok('level-3 member sees lessons', (await c.query('select 1 from public.lessons where id=$1', [les.id])).rowCount === 1)
  await c.query(`insert into public.lesson_progress (lesson_id) values ($1)`, [les.id])
  ok('can complete unlocked lesson', true)

  const lb = (await c.query('select * from public.leaderboard($1, 7)', [cid])).rows
  ok('leaderboard works for members', lb.length === 2)
  await asAnon()
  ok('anon cannot call leaderboard', (await denied('select * from public.leaderboard($1, 7)', [cid])) === 'error')
  ok('anon can read community_stats', (await c.query('select * from public.community_stats($1)', [cid])).rows[0].member_count >= 2)
} catch (e) {
  console.error('ERROR', e.message); fail++
} finally {
  await c.query('rollback'); await c.end()
  const left = await new pg.Client({ host: `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`, user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } })
  await left.connect(); console.log('users remaining after rollback:', (await left.query('select count(*) from auth.users')).rows[0].count); await left.end()
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
}
