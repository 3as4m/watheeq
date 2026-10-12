// Runs RLS/behaviour assertions inside a transaction that is always rolled back.
import 'dotenv/config'
import { dbClient } from './db.mjs'

const c = dbClient()
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
  // fresh community inside the rolled-back transaction so real data never affects the assertions
  const cid = (await c.query(`insert into public.communities (slug,name) values ('rls-test','RLS') returning id`)).rows[0].id
  await c.query(`insert into public.community_invites (community_id, code) values ($1, 'rlstestcode')`, [cid])
  ok('signup creates profile only (no auto-join)', (await c.query('select count(*)::int n from public.members where user_id = any($1)', [[A, B]])).rows[0].n === 0)
  await c.query(`insert into public.members (community_id,user_id,role) values ($1,$2,'owner')`, [cid, A])
  await as(B)
  ok('member joins with invite code', (await c.query(`select public.join_community(null, 'rlstestcode') s`)).rows[0].s === 'rls-test')
  ok('bad invite code rejected', (await denied(`select public.join_community(null, 'nope')`)) === 'error')
  ok('member cannot read invite code', (await c.query('select 1 from public.community_invites')).rowCount === 0)
  ok('member cannot create community', (await denied(`select public.create_community('x-test','X')`)) === 'error')
  ok('member cannot open platform overview', (await denied('select * from public.platform_overview()')) === 'error')
  ok('member cannot read member analytics', (await denied('select * from public.member_analytics($1)', [cid])) === 'error')
  ok('member cannot make self platform admin', (await denied(`select public.set_platform_admin($1, true)`, [B])) === 'error')
  await c.query('reset role')
  const roles = (await c.query('select user_id, role from public.members where community_id=$1', [cid])).rows
  ok('roles set up', roles.find((r) => r.user_id === A)?.role === 'owner' && roles.find((r) => r.user_id === B)?.role === 'member')

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

  // quizzes: keys hidden, grading server-side, first pass awards points once
  await as(A)
  const quizId = (await c.query(`select public.save_quiz($1) id`, [JSON.stringify({ lesson_id: les.id, title: 'Q', pass_score: 50, points: 5, questions: [
    { kind: 'single', prompt: 'one', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct: ['b'], explanation: 'because' },
    { kind: 'multiple', prompt: 'two', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }], correct: ['a', 'c'] },
    { kind: 'text', prompt: 'reflect' },
  ] })])).rows[0].id
  ok('admin saves quiz via save_quiz', !!quizId)
  ok('save_quiz rejects question without answer', (await denied(`select public.save_quiz($1)`, [JSON.stringify({ lesson_id: les.id, title: 'bad', questions: [{ kind: 'single', prompt: 'x', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }] })])) === 'error')
  const qs = (await c.query('select id, kind from public.quiz_questions where quiz_id=$1 order by position', [quizId])).rows
  ok('admin reads answer keys', (await c.query('select 1 from public.quiz_answer_keys where question_id = any($1)', [qs.map((q) => q.id)])).rowCount === 2 + 1)
  await as(B)
  ok('member sees quiz questions', (await c.query('select 1 from public.quiz_questions where quiz_id=$1', [quizId])).rowCount === 3)
  ok('member cannot read answer keys', (await c.query('select 1 from public.quiz_answer_keys')).rowCount === 0)
  ok('member cannot write quiz', (await denied(`select public.save_quiz($1)`, [JSON.stringify({ lesson_id: les.id, title: 'x', questions: [{ kind: 'text', prompt: 'p' }] })])) === 'error')
  ok('member cannot insert attempt directly', (await denied(`insert into public.quiz_attempts (quiz_id,user_id,answers,score,correct_count,graded_count,passed) values ($1,$2,'{}',100,1,1,true)`, [quizId, B])) === 'error')
  const before = (await c.query('select points from public.members where user_id=$1 and community_id=$2', [B, cid])).rows[0].points
  const fail1 = (await c.query('select public.submit_quiz($1,$2) r', [quizId, JSON.stringify({ [qs[0].id]: ['a'], [qs[1].id]: ['a'] })])).rows[0].r
  ok('wrong answers graded 0 and fail', fail1.score === 0 && fail1.passed === false && fail1.results[0].correct_options[0] === 'b')
  const pass1 = (await c.query('select public.submit_quiz($1,$2) r', [quizId, JSON.stringify({ [qs[0].id]: ['b'], [qs[1].id]: ['c', 'a'], [qs[2].id]: 'my thoughts' })])).rows[0].r
  ok('right answers graded 100, order-insensitive', pass1.score === 100 && pass1.passed && pass1.points_awarded === 5)
  await c.query('select public.submit_quiz($1,$2)', [quizId, JSON.stringify({ [qs[0].id]: ['b'], [qs[1].id]: ['a', 'c'] })])
  ok('quiz points awarded only on first pass', (await c.query('select points from public.members where user_id=$1 and community_id=$2', [B, cid])).rows[0].points === before + 5)
  ok('member sees own attempts only', (await c.query('select 1 from public.quiz_attempts')).rowCount === 3)

  // attendance
  await as(A)
  const liveEv = (await c.query(`insert into public.events (community_id,title,starts_at,ends_at) values ($1,'live',now()-interval '5 minutes',now()+interval '1 hour') returning id`, [cid])).rows[0].id
  const pastEv = (await c.query(`insert into public.events (community_id,title,starts_at) values ($1,'past',now()-interval '3 days') returning id`, [cid])).rows[0].id
  await as(B)
  ok('member can self check-in during event', (await c.query('select public.check_in($1) s', [liveEv])).rows[0].s === 'present')
  ok('self check-in closed for past event', (await denied('select public.check_in($1)', [pastEv])) === 'error')
  ok('member cannot mark attendance directly', (await denied(`insert into public.event_attendance (event_id,user_id) values ($1,$2)`, [pastEv, B])) === 'error')
  ok('member cannot upgrade own attendance', (await denied(`update public.event_attendance set status='excused' where event_id=$1`, [liveEv])) !== 'allowed')
  const pts1 = (await c.query('select points from public.members where user_id=$1 and community_id=$2', [B, cid])).rows[0].points
  await as(A)
  await c.query(`insert into public.event_attendance (event_id,user_id,status) values ($1,$2,'late')`, [pastEv, B])
  ok('staff marks attendance, member earns 3 points', (await c.query('select points from public.members where user_id=$1 and community_id=$2', [B, cid])).rows[0].points === pts1 + 3)
  await c.query(`update public.event_attendance set status='absent' where event_id=$1 and user_id=$2`, [pastEv, B])
  ok('marking absent takes the points back', (await c.query('select points from public.members where user_id=$1 and community_id=$2', [B, cid])).rows[0].points === pts1)
  const an = (await c.query('select * from public.member_analytics($1)', [cid])).rows.find((r) => r.user_id === B)
  ok('analytics: attendance + quizzes (events before joining excluded)', an.events_attended == 1 && an.quizzes_passed == 1 && an.quiz_avg === 100 && an.events_held == 1 && an.attendance_rate === 100)

  // platform admin
  await c.query('reset role')
  const P = (await c.query(`insert into auth.users (id,email,instance_id,aud,role) values (gen_random_uuid(),'platform-test@example.com','00000000-0000-0000-0000-000000000000','authenticated','authenticated') returning id`)).rows[0].id
  await c.query('insert into public.platform_admins (user_id) values ($1)', [P])
  await as(P)
  ok('platform admin sees any community content', (await c.query('select 1 from public.posts where community_id=$1', [cid])).rowCount >= 1)
  ok('platform admin creates community with owner', (await c.query(`select public.create_community('rls-two','Two',null,null,true,'member-test@example.com') s`)).rows[0].s === 'rls-two')
  const two = (await c.query(`select id from public.communities where slug='rls-two'`)).rows[0].id
  ok('new community gets categories + invite', (await c.query('select 1 from public.categories where community_id=$1', [two])).rowCount === 4 && (await c.query('select 1 from public.community_invites where community_id=$1', [two])).rowCount === 1)
  ok('platform overview lists communities', (await c.query('select * from public.platform_overview()')).rows.some((r) => r.slug === 'rls-two'))
  ok('platform admin adds member by email', (await c.query(`select public.add_member_by_email($1,'owner-test@example.com','admin') s`, [two])).rows[0].s === 'ok')
  await as(A)
  ok('admin of one community cannot grant owner', (await denied(`select public.add_member_by_email($1,'platform-test@example.com','owner')`, [two])) === 'error')
  ok('community admin cannot delete community', (await denied('delete from public.communities where id=$1', [two])) !== 'allowed')
  await as(B)
  ok('owner of private community sees it', (await c.query('select 1 from public.communities where id=$1', [two])).rowCount === 1)
  await as(P)
  await c.query('delete from public.communities where id=$1', [two])
  ok('platform admin deletes community', (await c.query('select 1 from public.communities where id=$1', [two])).rowCount === 0)
  await as(B)
  await asAnon()
  ok('anon cannot call leaderboard', (await denied('select * from public.leaderboard($1, 7)', [cid])) === 'error')
  ok('anon can read community_stats', (await c.query('select * from public.community_stats($1)', [cid])).rows[0].member_count >= 2)
} catch (e) {
  console.error('ERROR', e.message); fail++
} finally {
  await c.query('rollback'); await c.end()
  const left = await dbClient()
  await left.connect(); console.log('users remaining after rollback:', (await left.query('select count(*) from auth.users')).rows[0].count); await left.end()
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
}
