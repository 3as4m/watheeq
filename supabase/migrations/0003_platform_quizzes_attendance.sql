-- Watheeq 0003: many communities run from one platform, lesson quizzes, and event attendance.
--   * platform_admins can create communities and act as admin inside every community.
--   * Joining is explicit: public communities from the directory, private ones by invite code.
--   * Quizzes hang off a lesson; answer keys live in their own staff-only table and grading
--     happens server-side in submit_quiz(), so members never receive the correct answers up front.
--   * Attendance is marked by staff or by the member checking in during the event window.

-- ---------------------------------------------------------------- platform admins
create table public.platform_admins (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Platform admins count as admin (and therefore member and staff) in every community.
create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid()))
      or public.is_platform_admin();
$$;

create or replace function public.is_staff(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid())
                   and m.role in ('owner', 'admin', 'moderator'))
      or public.is_platform_admin();
$$;

create or replace function public.is_admin(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid())
                   and m.role in ('owner', 'admin'))
      or public.is_platform_admin();
$$;

-- Platform admins may hand out the owner role; everyone else keeps the old rules.
create or replace function public.guard_member_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_platform_admin() then
    if new.user_id = (select auth.uid()) or new.role = 'owner' or old.role = 'owner' then
      raise exception 'role change not allowed';
    end if;
  end if;
  return new;
end;
$$;

-- Signup now only creates the profile. Communities are joined from the directory or by invite.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare base text;
begin
  base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then base := 'user'; end if;
  base := left(base, 20);
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 5),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(base, ''), 'عضو'), 60)
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------- communities
alter table public.communities
  add column archived    boolean not null default false,
  add column created_by  uuid references public.profiles (id) on delete set null;

drop policy communities_select on public.communities;
create policy communities_select_anon on public.communities for select to anon
  using (not is_private and not archived);
create policy communities_select on public.communities for select to authenticated
  using ((not is_private and not archived) or public.is_member(id));
create policy communities_delete on public.communities for delete to authenticated
  using (public.is_platform_admin());

create table public.community_invites (
  community_id  uuid primary key references public.communities (id) on delete cascade,
  code          text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10)
);
alter table public.community_invites enable row level security;
create policy invites_select on public.community_invites for select to authenticated
  using (public.is_admin(community_id));
insert into public.community_invites (community_id) select id from public.communities;

create function public.new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$$;

create function public.regenerate_invite(cid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := public.new_invite_code();
begin
  if not public.is_admin(cid) then raise exception 'not allowed'; end if;
  insert into public.community_invites (community_id, code) values (cid, c)
    on conflict (community_id) do update set code = excluded.code;
  return c;
end;
$$;

-- Preview for the /join/<code> page, readable before signing in.
create function public.community_by_invite(p_code text)
returns table (id uuid, slug text, name text, tagline text, about text, member_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.name, c.tagline, c.about,
         (select count(*) from public.members m where m.community_id = c.id)
    from public.community_invites i join public.communities c on c.id = i.community_id
   where i.code = p_code and not c.archived;
$$;

-- Join a public community by id, or any community with its invite code. Returns the slug.
create function public.join_community(cid uuid default null, p_code text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare c public.communities;
begin
  if (select auth.uid()) is null then raise exception 'not allowed'; end if;
  if p_code is not null then
    select x.* into c from public.community_invites i join public.communities x on x.id = i.community_id where i.code = p_code;
  else
    select * into c from public.communities where id = cid and not is_private;
  end if;
  if c.id is null or c.archived then raise exception 'رابط الدعوة غير صالح أو المجتمع غير متاح'; end if;
  insert into public.members (community_id, user_id, role) values (c.id, (select auth.uid()), 'member')
    on conflict do nothing;
  return c.slug;
end;
$$;

create function public.create_community(p_slug text, p_name text, p_tagline text default null, p_about text default null,
                                        p_private boolean default false, p_owner_email text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare cid uuid; owner_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  if exists (select 1 from public.communities where slug = lower(p_slug)) then
    raise exception 'هذا المعرف مستخدم لمجتمع آخر';
  end if;
  if nullif(trim(p_owner_email), '') is not null then
    select id into owner_id from auth.users where lower(email) = lower(trim(p_owner_email));
    if owner_id is null then raise exception 'لا يوجد حساب بهذا البريد'; end if;
  end if;
  insert into public.communities (slug, name, tagline, about, is_private, created_by)
  values (lower(p_slug), trim(p_name), nullif(trim(p_tagline), ''), nullif(trim(p_about), ''), p_private, (select auth.uid()))
  returning id into cid;
  insert into public.community_invites (community_id) values (cid);
  insert into public.categories (community_id, name, position)
  values (cid, 'عام', 0), (cid, 'نقاشات', 1), (cid, 'أسئلة', 2), (cid, 'إنجازات', 3);
  if owner_id is not null then
    insert into public.members (community_id, user_id, role) values (cid, owner_id, 'owner');
  end if;
  return lower(p_slug);
end;
$$;

-- Add (or re-role) an existing account by email. Only platform admins can grant 'owner'.
create function public.add_member_by_email(cid uuid, p_email text, p_role public.member_role default 'member') returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.is_admin(cid) or (p_role = 'owner' and not public.is_platform_admin()) then
    raise exception 'not allowed';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'لا يوجد حساب بهذا البريد، اطلب من صاحبه إنشاء حساب أولا'; end if;
  insert into public.members (community_id, user_id, role) values (cid, uid, p_role)
    on conflict (community_id, user_id) do update set role = excluded.role;
  return 'ok';
end;
$$;

create function public.set_platform_admin(uid uuid, val boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  if uid = (select auth.uid()) and not val then raise exception 'لا يمكنك إزالة صلاحيتك بنفسك'; end if;
  if val then
    insert into public.platform_admins (user_id) values (uid) on conflict do nothing;
  else
    delete from public.platform_admins where user_id = uid;
  end if;
end;
$$;

-- ---------------------------------------------------------------- quizzes
create type public.question_kind as enum ('single', 'multiple', 'text');

create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  lesson_id     uuid references public.lessons (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  pass_score    int not null default 60 check (pass_score between 0 and 100),
  points        int not null default 5 check (points between 0 and 100),
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index quizzes_lesson_idx on public.quizzes (lesson_id) where lesson_id is not null;
create index quizzes_community_idx on public.quizzes (community_id);

create table public.quiz_questions (
  id        uuid primary key default gen_random_uuid(),
  quiz_id   uuid not null references public.quizzes (id) on delete cascade,
  kind      public.question_kind not null default 'single',
  prompt    text not null check (char_length(prompt) between 1 and 1000),
  options   jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),  -- [{ "id": "a", "text": "..." }]
  position  int not null default 0
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table public.quiz_answer_keys (
  question_id  uuid primary key references public.quiz_questions (id) on delete cascade,
  correct      text[] not null default '{}',
  explanation  text check (char_length(explanation) <= 2000)
);

create table public.quiz_attempts (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  answers        jsonb not null check (pg_column_size(answers) < 60000),  -- { "<question id>": ["a"] | "free text" }
  score          int not null check (score between 0 and 100),
  correct_count  int not null,
  graded_count   int not null,
  passed         boolean not null,
  created_at     timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, created_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id, created_at desc);

create function public.lesson_course(lid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.course_id from public.lessons l join public.modules m on m.id = l.module_id where l.id = lid;
$$;

create function public.quiz_community(qid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select community_id from public.quizzes where id = qid;
$$;

create function public.question_quiz(qqid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select quiz_id from public.quiz_questions where id = qqid;
$$;

-- Create or update a quiz with all its questions and answer keys in one call.
-- p: { id?, lesson_id?, community_id?, title, description, pass_score, points, published,
--      questions: [{ id?, kind, prompt, options: [{id,text}], correct: [ids], explanation }] }
create function public.save_quiz(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  qid  uuid := nullif(p ->> 'id', '')::uuid;
  lid  uuid := nullif(p ->> 'lesson_id', '')::uuid;
  cid  uuid;
  q    jsonb;
  qqid uuid;
  keep uuid[] := '{}';
  pos  int := 0;
  k    public.question_kind;
  n    int := 0;
begin
  cid := case when lid is not null then public.course_community(public.lesson_course(lid))
              else nullif(p ->> 'community_id', '')::uuid end;
  if cid is null or not public.is_admin(cid) then raise exception 'not allowed'; end if;

  for q in select jsonb_array_elements(coalesce(p -> 'questions', '[]')) loop
    n := n + 1;
    k := coalesce(q ->> 'kind', 'single')::public.question_kind;
    if k <> 'text' then
      if jsonb_array_length(coalesce(q -> 'options', '[]')) < 2 then
        raise exception 'السؤال % يحتاج خيارين على الأقل', n;
      end if;
      if jsonb_array_length(coalesce(q -> 'correct', '[]')) < 1 then
        raise exception 'حدد الإجابة الصحيحة للسؤال %', n;
      end if;
    end if;
  end loop;
  if n = 0 then raise exception 'أضف سؤالا واحدا على الأقل'; end if;

  if qid is null then
    insert into public.quizzes (community_id, lesson_id, title, description, pass_score, points, published)
    values (cid, lid, trim(p ->> 'title'), nullif(trim(p ->> 'description'), ''),
            coalesce((p ->> 'pass_score')::int, 60), coalesce((p ->> 'points')::int, 5), coalesce((p ->> 'published')::boolean, true))
    returning id into qid;
  else
    update public.quizzes
       set title = trim(p ->> 'title'), description = nullif(trim(p ->> 'description'), ''),
           pass_score = coalesce((p ->> 'pass_score')::int, pass_score), points = coalesce((p ->> 'points')::int, points),
           published = coalesce((p ->> 'published')::boolean, published)
     where id = qid and community_id = cid;
    if not found then raise exception 'quiz not found'; end if;
  end if;

  for q in select jsonb_array_elements(p -> 'questions') loop
    qqid := nullif(q ->> 'id', '')::uuid;
    k := coalesce(q ->> 'kind', 'single')::public.question_kind;
    if qqid is not null and exists (select 1 from public.quiz_questions where id = qqid and quiz_id = qid) then
      update public.quiz_questions set kind = k, prompt = trim(q ->> 'prompt'),
             options = case when k = 'text' then '[]'::jsonb else q -> 'options' end, position = pos
       where id = qqid;
    else
      insert into public.quiz_questions (quiz_id, kind, prompt, options, position)
      values (qid, k, trim(q ->> 'prompt'), case when k = 'text' then '[]'::jsonb else q -> 'options' end, pos)
      returning id into qqid;
    end if;
    insert into public.quiz_answer_keys (question_id, correct, explanation)
    values (qqid, case when k = 'text' then '{}' else array(select jsonb_array_elements_text(q -> 'correct')) end,
            nullif(trim(q ->> 'explanation'), ''))
    on conflict (question_id) do update set correct = excluded.correct, explanation = excluded.explanation;
    keep := keep || qqid;
    pos := pos + 1;
  end loop;

  delete from public.quiz_questions where quiz_id = qid and not (id = any (keep));
  return qid;
end;
$$;

-- Grade an attempt, store it, award points on the first pass, and return the marked answers.
create function public.submit_quiz(qid uuid, answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  qz       public.quizzes;
  uid      uuid := (select auth.uid());
  r        record;
  picked   text[];
  ok       boolean;
  graded   int := 0;
  right_n  int := 0;
  results  jsonb := '[]';
  sc       int;
  pass     boolean;
  first    boolean;
begin
  select * into qz from public.quizzes where id = qid;
  if qz.id is null or uid is null or not public.is_member(qz.community_id)
     or (not qz.published and not public.is_staff(qz.community_id))
     or (qz.lesson_id is not null and not public.can_access_course(public.lesson_course(qz.lesson_id))) then
    raise exception 'not allowed';
  end if;
  if jsonb_typeof(answers) <> 'object' then raise exception 'invalid answers'; end if;

  for r in select q.id, q.kind, coalesce(k.correct, '{}') as correct, k.explanation
             from public.quiz_questions q left join public.quiz_answer_keys k on k.question_id = q.id
            where q.quiz_id = qid order by q.position loop
    if r.kind = 'text' then
      results := results || jsonb_build_array(jsonb_build_object('question_id', r.id, 'correct', null, 'correct_options', '[]'::jsonb, 'explanation', r.explanation));
      continue;
    end if;
    picked := case when jsonb_typeof(answers -> (r.id::text)) = 'array'
                   then array(select distinct x from jsonb_array_elements_text(answers -> (r.id::text)) x order by x)
                   else '{}' end;
    ok := picked = array(select distinct x from unnest(r.correct) x order by x);
    graded := graded + 1;
    if ok then right_n := right_n + 1; end if;
    results := results || jsonb_build_array(jsonb_build_object('question_id', r.id, 'correct', ok, 'correct_options', to_jsonb(r.correct), 'explanation', r.explanation));
  end loop;

  sc := case when graded = 0 then 100 else round(100.0 * right_n / graded)::int end;
  pass := sc >= qz.pass_score;
  first := not exists (select 1 from public.quiz_attempts where quiz_id = qid and user_id = uid and passed);
  insert into public.quiz_attempts (quiz_id, user_id, answers, score, correct_count, graded_count, passed)
  values (qid, uid, answers, sc, right_n, graded, pass);
  if pass and first and qz.points > 0 then
    perform public.award_points(qz.community_id, uid, qz.points, 'quiz_pass');
  end if;
  return jsonb_build_object('score', sc, 'passed', pass, 'correct_count', right_n, 'graded_count', graded,
                            'points_awarded', case when pass and first then qz.points else 0 end, 'results', results);
end;
$$;

alter table public.quizzes          enable row level security;
alter table public.quiz_questions   enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts    enable row level security;

create policy quizzes_select on public.quizzes for select to authenticated
  using (public.is_member(community_id) and (published or public.is_staff(community_id))
         and (lesson_id is null or public.can_access_course(public.lesson_course(lesson_id))));
create policy quizzes_delete on public.quizzes for delete to authenticated
  using (public.is_admin(community_id));
create policy quiz_questions_select on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes z where z.id = quiz_id));
create policy quiz_keys_select on public.quiz_answer_keys for select to authenticated
  using (public.is_staff(public.quiz_community(public.question_quiz(question_id))));
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff(public.quiz_community(quiz_id)));

-- ---------------------------------------------------------------- attendance
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');

create table public.event_attendance (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     public.attendance_status not null default 'present',
  method     text not null default 'staff' check (method in ('self', 'staff')),
  note       text check (char_length(note) <= 300),
  marked_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  marked_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendance_user_idx on public.event_attendance (user_id);

create function public.on_attendance_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare was boolean := false; now_in boolean := false; eid uuid; uid uuid;
begin
  if tg_op = 'DELETE' then
    was := old.status in ('present', 'late'); eid := old.event_id; uid := old.user_id;
  else
    now_in := new.status in ('present', 'late'); eid := new.event_id; uid := new.user_id;
    if tg_op = 'UPDATE' then was := old.status in ('present', 'late'); end if;
  end if;
  if now_in and not was then
    perform public.award_points(public.event_community(eid), uid, 3, 'attendance');
  elsif was and not now_in then
    perform public.award_points(public.event_community(eid), uid, -3, 'attendance_removed');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger event_attendance_points after insert or update or delete on public.event_attendance
  for each row execute function public.on_attendance_change();

create function public.touch_attendance() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.marked_by := (select auth.uid());
  new.marked_at := now();
  new.method := 'staff';
  return new;
end;
$$;
create trigger event_attendance_touch before update on public.event_attendance
  for each row execute function public.touch_attendance();

-- Self check-in: open from 15 minutes before the start until 30 minutes after the end.
create function public.check_in(eid uuid) returns public.attendance_status
language plpgsql security definer set search_path = '' as $$
declare ev public.events; uid uuid := (select auth.uid()); st public.attendance_status;
begin
  select * into ev from public.events where id = eid;
  if ev.id is null or not exists (select 1 from public.members where community_id = ev.community_id and user_id = uid) then
    raise exception 'not allowed';
  end if;
  if now() < ev.starts_at - interval '15 minutes'
     or now() > coalesce(ev.ends_at, ev.starts_at + interval '2 hours') + interval '30 minutes' then
    raise exception 'تسجيل الحضور متاح وقت اللقاء فقط';
  end if;
  insert into public.event_attendance (event_id, user_id, status, method)
  values (eid, uid, case when now() > ev.starts_at + interval '15 minutes' then 'late' else 'present' end, 'self')
  on conflict (event_id, user_id) do nothing;
  select status into st from public.event_attendance where event_id = eid and user_id = uid;
  return st;
end;
$$;

alter table public.event_attendance enable row level security;
create policy attendance_select on public.event_attendance for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff(public.event_community(event_id)));
create policy attendance_insert on public.event_attendance for insert to authenticated
  with check (public.is_staff(public.event_community(event_id))
              and exists (select 1 from public.members m where m.community_id = public.event_community(event_id) and m.user_id = event_attendance.user_id));
create policy attendance_update on public.event_attendance for update to authenticated
  using (public.is_staff(public.event_community(event_id))) with check (public.is_staff(public.event_community(event_id)));
create policy attendance_delete on public.event_attendance for delete to authenticated
  using (public.is_staff(public.event_community(event_id)));

-- ---------------------------------------------------------------- analytics
-- One row per member with everything we know about their engagement. This is the
-- participant dataset the dashboard shows, exports, and later feeds AI analysis.
create function public.member_analytics(cid uuid)
returns table (
  user_id uuid, username text, display_name text, avatar_url text, email text, role public.member_role,
  points int, level int, joined_at timestamptz, last_active_at timestamptz,
  posts bigint, comments bigint, lessons_completed bigint, lessons_total bigint,
  quiz_attempts bigint, quizzes_passed bigint, quiz_avg int, events_attended bigint, events_held bigint, attendance_rate int
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_admin(cid) then raise exception 'not allowed'; end if;
  return query
  with lt as (
    select l.id from public.lessons l join public.modules mo on mo.id = l.module_id join public.courses c on c.id = mo.course_id
     where c.community_id = cid and c.published and l.published
  ), qa as (
    select a.user_id, a.quiz_id, a.score, a.passed, a.created_at
      from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.community_id = cid
  ), ev as (
    select id, starts_at from public.events where community_id = cid and starts_at < now()
  ), att as (
    select a.user_id, a.event_id from public.event_attendance a join ev on ev.id = a.event_id where a.status in ('present', 'late')
  ), pc as (
    select author_id, count(*) n, max(created_at) last from public.posts where community_id = cid group by author_id
  ), cc as (
    select c.author_id, count(*) n, max(c.created_at) last
      from public.comments c join public.posts p on p.id = c.post_id where p.community_id = cid group by c.author_id
  ), lp as (
    select p.user_id, count(*) n, max(p.completed_at) last from public.lesson_progress p join lt on lt.id = p.lesson_id group by p.user_id
  )
  select m.user_id, pr.username, pr.display_name, pr.avatar_url, u.email::text, m.role,
         m.points, public.level_for_points(m.points), m.joined_at,
         greatest(pc.last, cc.last, lp.last, (select max(created_at) from qa where qa.user_id = m.user_id)),
         coalesce(pc.n, 0), coalesce(cc.n, 0), coalesce(lp.n, 0), (select count(*) from lt),
         (select count(*) from qa where qa.user_id = m.user_id),
         (select count(distinct quiz_id) from qa where qa.user_id = m.user_id and qa.passed),
         (select round(avg(best))::int from (select max(score) best from qa where qa.user_id = m.user_id group by quiz_id) b),
         (select count(*) from att where att.user_id = m.user_id),
         (select count(*) from ev where ev.starts_at >= m.joined_at - interval '1 day'),
         (select case when count(*) = 0 then null
                      else round(100.0 * (select count(*) from att where att.user_id = m.user_id) / count(*))::int end
            from ev where ev.starts_at >= m.joined_at - interval '1 day')
    from public.members m
    join public.profiles pr on pr.id = m.user_id
    join auth.users u on u.id = m.user_id
    left join pc on pc.author_id = m.user_id
    left join cc on cc.author_id = m.user_id
    left join lp on lp.user_id = m.user_id
   where m.community_id = cid
   order by m.points desc, m.joined_at;
end;
$$;

create function public.platform_overview()
returns table (
  id uuid, slug text, name text, tagline text, is_private boolean, archived boolean, created_at timestamptz,
  members bigint, active_30d bigint, posts_30d bigint, lessons_completed bigint,
  quiz_attempts bigint, quiz_avg int, events_held bigint, attendance_rate int
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  return query
  select c.id, c.slug, c.name, c.tagline, c.is_private, c.archived, c.created_at,
    (select count(*) from public.members m where m.community_id = c.id),
    (select count(distinct x.uid) from (
        select author_id uid from public.posts where community_id = c.id and created_at > now() - interval '30 days'
        union all
        select cm.author_id from public.comments cm join public.posts p on p.id = cm.post_id
         where p.community_id = c.id and cm.created_at > now() - interval '30 days'
        union all
        select lp.user_id from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
          join public.modules mo on mo.id = l.module_id join public.courses co on co.id = mo.course_id
         where co.community_id = c.id and lp.completed_at > now() - interval '30 days'
        union all
        select a.user_id from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
         where q.community_id = c.id and a.created_at > now() - interval '30 days'
      ) x where exists (select 1 from public.members m where m.community_id = c.id and m.user_id = x.uid)),
    (select count(*) from public.posts p where p.community_id = c.id and p.created_at > now() - interval '30 days'),
    (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
       join public.modules mo on mo.id = l.module_id join public.courses co on co.id = mo.course_id where co.community_id = c.id),
    (select count(*) from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.community_id = c.id),
    (select round(avg(a.score))::int from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.community_id = c.id),
    (select count(*) from public.events e where e.community_id = c.id and e.starts_at < now()),
    (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where a.status in ('present', 'late')) / count(*))::int end
       from public.event_attendance a join public.events e on e.id = a.event_id where e.community_id = c.id)
  from public.communities c
  order by c.archived, c.created_at;
end;
$$;

create function public.platform_users(p_search text default null)
returns table (id uuid, email text, display_name text, username text, avatar_url text, created_at timestamptz,
               last_sign_in_at timestamptz, is_platform_admin boolean, communities jsonb)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  return query
  select u.id, u.email::text, p.display_name, p.username, p.avatar_url, u.created_at, u.last_sign_in_at,
         exists (select 1 from public.platform_admins a where a.user_id = u.id),
         coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'role', m.role) order by c.created_at)
                     from public.members m join public.communities c on c.id = m.community_id where m.user_id = u.id), '[]')
    from auth.users u join public.profiles p on p.id = u.id
   where (u.banned_until is null or u.banned_until < now())
     and (p_search is null or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%')
   order by u.created_at desc
   limit 300;
end;
$$;

-- ---------------------------------------------------------------- grants
grant select on public.platform_admins to authenticated;
grant delete on public.communities to authenticated;
grant update (archived) on public.communities to authenticated;
grant select on public.community_invites to authenticated;
grant select, delete on public.quizzes to authenticated;
grant select on public.quiz_questions, public.quiz_answer_keys, public.quiz_attempts to authenticated;
grant select, delete on public.event_attendance to authenticated;
grant insert (event_id, user_id, status, note) on public.event_attendance to authenticated;
grant update (status, note) on public.event_attendance to authenticated;

revoke all on function
  public.is_platform_admin(), public.new_invite_code(), public.regenerate_invite(uuid), public.community_by_invite(text),
  public.join_community(uuid, text), public.create_community(text, text, text, text, boolean, text),
  public.add_member_by_email(uuid, text, public.member_role), public.set_platform_admin(uuid, boolean),
  public.lesson_course(uuid), public.quiz_community(uuid), public.question_quiz(uuid),
  public.save_quiz(jsonb), public.submit_quiz(uuid, jsonb),
  public.on_attendance_change(), public.touch_attendance(), public.check_in(uuid),
  public.member_analytics(uuid), public.platform_overview(), public.platform_users(text)
  from public, anon, authenticated;

grant execute on function
  public.is_platform_admin(), public.lesson_course(uuid), public.quiz_community(uuid), public.question_quiz(uuid),
  public.regenerate_invite(uuid), public.join_community(uuid, text), public.create_community(text, text, text, text, boolean, text),
  public.add_member_by_email(uuid, text, public.member_role), public.set_platform_admin(uuid, boolean),
  public.save_quiz(jsonb), public.submit_quiz(uuid, jsonb), public.check_in(uuid),
  public.member_analytics(uuid), public.platform_overview(), public.platform_users(text)
  to authenticated;
grant execute on function public.community_by_invite(text) to anon, authenticated;
