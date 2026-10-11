-- Watheeq: community platform schema (single community, multi-tenant-ready).
-- Every table has RLS enabled. Nothing is exposed to API roles except via explicit grants below.

-- ---------------------------------------------------------------- enums
create type public.member_role as enum ('owner', 'admin', 'moderator', 'member');

-- ---------------------------------------------------------------- core tables
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  tagline     text,
  about       text,
  logo_url    text,
  cover_url   text,
  is_private  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  avatar_url    text,
  bio           text check (char_length(bio) <= 500),
  location      text check (char_length(location) <= 80),
  created_at    timestamptz not null default now()
);

create table public.members (
  community_id  uuid not null references public.communities (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.member_role not null default 'member',
  points        int not null default 0 check (points >= 0),
  joined_at     timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index members_user_idx on public.members (user_id);
create index members_points_idx on public.members (community_id, points desc);

create table public.point_log (
  id            bigint generated always as identity primary key,
  community_id  uuid not null references public.communities (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  delta         int not null,
  reason        text not null,
  created_at    timestamptz not null default now()
);
create index point_log_period_idx on public.point_log (community_id, created_at desc);

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  color         text not null default '#297289' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position      int not null default 0
);
create index categories_community_idx on public.categories (community_id, position);

-- ---------------------------------------------------------------- feed
create table public.posts (
  id                uuid primary key default gen_random_uuid(),
  community_id      uuid not null references public.communities (id) on delete cascade,
  author_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id       uuid references public.categories (id) on delete set null,
  title             text not null check (char_length(title) between 1 and 200),
  body              text not null default '' check (char_length(body) <= 20000),
  media             text[] not null default '{}' check (cardinality(media) <= 10),
  pinned            boolean not null default false,
  like_count        int not null default 0,
  comment_count     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now()
);
create index posts_feed_idx on public.posts (community_id, pinned desc, last_activity_at desc);
create index posts_author_idx on public.posts (author_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 5000),
  like_count  int not null default 0,
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

create table public.post_likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.comment_likes (
  comment_id  uuid not null references public.comments (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index comment_likes_user_idx on public.comment_likes (user_id);

-- ---------------------------------------------------------------- classroom
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  cover_url     text,
  position      int not null default 0,
  published     boolean not null default false,
  min_level     int not null default 1 check (min_level between 1 and 9),
  created_at    timestamptz not null default now()
);
create index courses_community_idx on public.courses (community_id, position);

create table public.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  position   int not null default 0
);
create index modules_course_idx on public.modules (course_id, position);

create table public.lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.modules (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null default '' check (char_length(body) <= 50000),
  video_url  text,
  position   int not null default 0,
  published  boolean not null default true
);
create index lessons_module_idx on public.lessons (module_id, position);

create table public.lesson_progress (
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------- events
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  description   text check (char_length(description) <= 5000),
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  link_url      text,
  cover_url     text,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_community_idx on public.events (community_id, starts_at);

create table public.event_rsvps (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------- RLS helpers
-- security definer so policies can read members without recursing into members' own policies.
create function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid()));
$$;

create function public.is_staff(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid())
                   and m.role in ('owner', 'admin', 'moderator'));
$$;

create function public.is_admin(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.community_id = cid and m.user_id = (select auth.uid())
                   and m.role in ('owner', 'admin'));
$$;

create function public.level_for_points(p int) returns int
language sql immutable set search_path = '' as $$
  select case when p >= 33015 then 9 when p >= 8015 then 8 when p >= 2015 then 7
              when p >= 515 then 6 when p >= 155 then 5 when p >= 65 then 4
              when p >= 20 then 3 when p >= 5 then 2 else 1 end;
$$;

create function public.my_level(cid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select public.level_for_points(m.points) from public.members m
                   where m.community_id = cid and m.user_id = (select auth.uid())), 0);
$$;

create function public.post_community(pid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select community_id from public.posts where id = pid;
$$;

create function public.comment_community(cmid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.community_id from public.comments c join public.posts p on p.id = c.post_id where c.id = cmid;
$$;

create function public.course_community(cid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select community_id from public.courses where id = cid;
$$;

create function public.module_course(mid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select course_id from public.modules where id = mid;
$$;

create function public.event_community(eid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select community_id from public.events where id = eid;
$$;

-- A member can open a course when it is published and their level meets min_level (staff always can).
create function public.can_access_course(crs uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = crs
      and public.is_member(c.community_id)
      and (public.is_staff(c.community_id)
           or (c.published and public.my_level(c.community_id) >= c.min_level))
  );
$$;

-- ---------------------------------------------------------------- points
create function public.award_points(cid uuid, uid uuid, delta int, reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set points = greatest(points + delta, 0)
   where community_id = cid and user_id = uid;
  if found then
    insert into public.point_log (community_id, user_id, delta, reason) values (cid, uid, delta, reason);
  end if;
end;
$$;

-- ---------------------------------------------------------------- triggers
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

create function public.on_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a uuid; cid uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id
      returning author_id, community_id into a, cid;
    if a is not null and a <> new.user_id then
      perform public.award_points(cid, a, 1, 'post_like');
    end if;
    return new;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id
      returning author_id, community_id into a, cid;
    if a is not null and a <> old.user_id then
      perform public.award_points(cid, a, -1, 'post_like_removed');
    end if;
    return old;
  end if;
end;
$$;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.on_post_like();

create function public.on_comment_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a uuid; pid uuid; cid uuid;
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id
      returning author_id, post_id into a, pid;
    if a is not null and a <> new.user_id then
      perform public.award_points(public.post_community(pid), a, 1, 'comment_like');
    end if;
    return new;
  else
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id
      returning author_id, post_id into a, pid;
    if a is not null and a <> old.user_id then
      perform public.award_points(public.post_community(pid), a, -1, 'comment_like_removed');
    end if;
    return old;
  end if;
end;
$$;
create trigger comment_likes_count after insert or delete on public.comment_likes
  for each row execute function public.on_comment_like();

create function public.on_comment_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1, last_activity_at = now()
     where id = new.post_id;
    return new;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end;
$$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.on_comment_change();

-- replies are one level deep and must live under the same post
create function public.check_comment_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.parent_id is not null then
    select post_id, parent_id into p from public.comments where id = new.parent_id;
    if p.post_id is distinct from new.post_id or p.parent_id is not null then
      raise exception 'invalid parent comment';
    end if;
  end if;
  return new;
end;
$$;
create trigger comments_parent_check before insert on public.comments
  for each row execute function public.check_comment_parent();

-- role changes: nobody edits their own role, and the owner role is never granted or revoked through the API
create function public.guard_member_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    if new.user_id = (select auth.uid()) or new.role = 'owner' or old.role = 'owner' then
      raise exception 'role change not allowed';
    end if;
  end if;
  return new;
end;
$$;
create trigger members_guard before update on public.members
  for each row execute function public.guard_member_update();

-- signup: create profile and join the default community; the very first user becomes its owner
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  cid uuid;
  has_owner boolean;
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

  select id into cid from public.communities order by created_at limit 1;
  if cid is not null then
    select exists (select 1 from public.members where community_id = cid and role = 'owner') into has_owner;
    insert into public.members (community_id, user_id, role)
    values (cid, new.id, case when has_owner then 'member'::public.member_role else 'owner'::public.member_role end);
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RPCs
create function public.set_post_pinned(pid uuid, val boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff(public.post_community(pid)) then
    raise exception 'not allowed';
  end if;
  update public.posts set pinned = val where id = pid;
end;
$$;

create function public.community_stats(cid uuid)
returns table (member_count bigint, post_count bigint)
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.members where community_id = cid),
         (select count(*) from public.posts where community_id = cid);
$$;

create function public.leaderboard(cid uuid, days int default null)
returns table (user_id uuid, username text, display_name text, avatar_url text, points bigint, level int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(cid) then
    raise exception 'not allowed';
  end if;
  if days is null then
    return query
      select m.user_id, p.username, p.display_name, p.avatar_url,
             m.points::bigint, public.level_for_points(m.points)
        from public.members m join public.profiles p on p.id = m.user_id
       where m.community_id = cid
       order by m.points desc, m.joined_at
       limit 50;
  else
    return query
      select m.user_id, p.username, p.display_name, p.avatar_url,
             coalesce(sum(l.delta), 0)::bigint, public.level_for_points(m.points)
        from public.members m
        join public.profiles p on p.id = m.user_id
        left join public.point_log l
          on l.community_id = m.community_id and l.user_id = m.user_id
         and l.created_at >= now() - make_interval(days => days)
       where m.community_id = cid
       group by m.user_id, p.username, p.display_name, p.avatar_url, m.points, m.joined_at
       order by 5 desc, m.joined_at
       limit 50;
  end if;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.communities     enable row level security;
alter table public.profiles        enable row level security;
alter table public.members         enable row level security;
alter table public.point_log       enable row level security;
alter table public.categories      enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.post_likes      enable row level security;
alter table public.comment_likes   enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.events          enable row level security;
alter table public.event_rsvps     enable row level security;

-- communities: public landing info; admins edit
create policy communities_select on public.communities for select to anon, authenticated using (true);
create policy communities_update on public.communities for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- members (point_log has no policies: only readable through leaderboard())
create policy members_select on public.members for select to authenticated
  using (public.is_member(community_id));
create policy members_update on public.members for update to authenticated
  using (public.is_admin(community_id)) with check (public.is_admin(community_id));
create policy members_delete on public.members for delete to authenticated
  using ((user_id = (select auth.uid()) or public.is_admin(community_id)) and role <> 'owner');

-- categories
create policy categories_select on public.categories for select to authenticated
  using (public.is_member(community_id));
create policy categories_write on public.categories for all to authenticated
  using (public.is_admin(community_id)) with check (public.is_admin(community_id));

-- posts
create policy posts_select on public.posts for select to authenticated
  using (public.is_member(community_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_member(community_id));
create policy posts_update on public.posts for update to authenticated
  using (author_id = (select auth.uid()) or public.is_staff(community_id))
  with check (author_id = (select auth.uid()) or public.is_staff(community_id));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_staff(community_id));

-- comments
create policy comments_select on public.comments for select to authenticated
  using (public.is_member(public.post_community(post_id)));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_member(public.post_community(post_id)));
create policy comments_update on public.comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_staff(public.post_community(post_id)));

-- likes
create policy post_likes_select on public.post_likes for select to authenticated
  using (public.is_member(public.post_community(post_id)));
create policy post_likes_insert on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(public.post_community(post_id)));
create policy post_likes_delete on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy comment_likes_select on public.comment_likes for select to authenticated
  using (public.is_member(public.comment_community(comment_id)));
create policy comment_likes_insert on public.comment_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(public.comment_community(comment_id)));
create policy comment_likes_delete on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- classroom
create policy courses_select on public.courses for select to authenticated
  using (public.is_member(community_id) and (published or public.is_staff(community_id)));
create policy courses_write on public.courses for all to authenticated
  using (public.is_admin(community_id)) with check (public.is_admin(community_id));

create policy modules_select on public.modules for select to authenticated
  using (public.can_access_course(course_id));
create policy modules_write on public.modules for all to authenticated
  using (public.is_admin(public.course_community(course_id)))
  with check (public.is_admin(public.course_community(course_id)));

create policy lessons_select on public.lessons for select to authenticated
  using (public.can_access_course(public.module_course(module_id))
         and (published or public.is_staff(public.course_community(public.module_course(module_id)))));
create policy lessons_write on public.lessons for all to authenticated
  using (public.is_admin(public.course_community(public.module_course(module_id))))
  with check (public.is_admin(public.course_community(public.module_course(module_id))));

-- progress: only for lessons the caller can currently see (RLS on lessons applies inside the subquery)
create policy progress_select on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy progress_insert on public.lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.lessons l where l.id = lesson_id));
create policy progress_delete on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- events
create policy events_select on public.events for select to authenticated
  using (public.is_member(community_id));
create policy events_write on public.events for all to authenticated
  using (public.is_admin(community_id)) with check (public.is_admin(community_id));

create policy rsvps_select on public.event_rsvps for select to authenticated
  using (public.is_member(public.event_community(event_id)));
create policy rsvps_insert on public.event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(public.event_community(event_id)));
create policy rsvps_delete on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- grants (explicit; auto-exposure is off)
grant usage on schema public to anon, authenticated;

grant select on public.communities to anon, authenticated;
grant update (name, tagline, about, logo_url, cover_url, is_private) on public.communities to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, username, avatar_url, bio, location) on public.profiles to authenticated;

grant select, delete on public.members to authenticated;
grant update (role) on public.members to authenticated;

grant select, insert, update, delete on public.categories to authenticated;

grant select, delete on public.posts to authenticated;
grant insert (community_id, category_id, title, body, media) on public.posts to authenticated;
grant update (category_id, title, body, media) on public.posts to authenticated;

grant select, delete on public.comments to authenticated;
grant insert (post_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

grant select, insert, delete on public.post_likes, public.comment_likes to authenticated;

grant select, insert, update, delete on public.courses, public.modules, public.lessons to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.event_rsvps to authenticated;

-- functions: lock everything down, then open only what the client needs
revoke all on function
  public.is_member(uuid), public.is_staff(uuid), public.is_admin(uuid), public.level_for_points(int),
  public.my_level(uuid), public.post_community(uuid), public.comment_community(uuid),
  public.course_community(uuid), public.module_course(uuid), public.event_community(uuid),
  public.can_access_course(uuid), public.award_points(uuid, uuid, int, text),
  public.touch_updated_at(), public.on_post_like(), public.on_comment_like(), public.on_comment_change(),
  public.check_comment_parent(), public.guard_member_update(), public.handle_new_user(),
  public.set_post_pinned(uuid, boolean), public.community_stats(uuid), public.leaderboard(uuid, int)
  from public, anon, authenticated;

-- RLS policy helpers must be callable by the roles evaluating the policies
grant execute on function
  public.is_member(uuid), public.is_staff(uuid), public.is_admin(uuid), public.level_for_points(int),
  public.my_level(uuid), public.post_community(uuid), public.comment_community(uuid),
  public.course_community(uuid), public.module_course(uuid), public.event_community(uuid),
  public.can_access_course(uuid)
  to authenticated;

grant execute on function public.set_post_pinned(uuid, boolean), public.leaderboard(uuid, int) to authenticated;
grant execute on function public.community_stats(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('media',   'media',   true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do nothing;

create policy storage_own_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_own_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_own_delete on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- seed
insert into public.communities (slug, name, tagline, about) values (
  'watheeq',
  'مجتمع وثيق',
  'ميثاق الأسرة الواعية',
  'مجتمع عربي للأسر الواعية: نتعلم معا، نتشارك التجارب، ونبني جيل المستقبل.'
);

insert into public.categories (community_id, name, color, position)
select c.id, v.name, v.color, v.pos
  from public.communities c,
       (values ('عام', '#297289', 0), ('نقاشات', '#5b8a96', 1), ('أسئلة', '#a7c0c6', 2),
               ('نصائح', '#3d8f7a', 3), ('إنجازات', '#c2793f', 4)) as v(name, color, pos)
 where c.slug = 'watheeq';
