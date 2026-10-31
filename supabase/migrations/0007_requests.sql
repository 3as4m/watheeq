-- Members can ask for a new community or send a suggestion; platform admins triage them.
create table public.requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('community', 'suggestion')),
  title       text not null check (char_length(title) between 3 and 120),
  body        text not null default '' check (char_length(body) <= 3000),
  status      text not null default 'new' check (status in ('new', 'reviewing', 'done', 'declined')),
  created_at  timestamptz not null default now()
);
create index requests_created_idx on public.requests (created_at desc);
create index requests_user_idx on public.requests (user_id);

alter table public.requests enable row level security;
create policy requests_select on public.requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
create policy requests_insert on public.requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy requests_update on public.requests for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy requests_delete on public.requests for delete to authenticated
  using (public.is_platform_admin());

grant select, delete on public.requests to authenticated;
grant insert (kind, title, body) on public.requests to authenticated;
grant update (status) on public.requests to authenticated;
