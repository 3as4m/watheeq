-- check_in: the computed status needs an explicit cast to the enum.
create or replace function public.check_in(eid uuid) returns public.attendance_status
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
  values (eid, uid, (case when now() > ev.starts_at + interval '15 minutes' then 'late' else 'present' end)::public.attendance_status, 'self')
  on conflict (event_id, user_id) do nothing;
  select status into st from public.event_attendance where event_id = eid and user_id = uid;
  return st;
end;
$$;
