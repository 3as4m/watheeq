-- Public directory for the landing page: listed (public, not archived) communities with live counts.
-- Readable before signing in; never returns private or archived communities.
create function public.community_directory()
returns table (id uuid, slug text, name text, tagline text, about text, cover_url text,
               price_amount int, price_currency text, price_interval text,
               member_count bigint, course_count bigint, upcoming_events bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.name, c.tagline, c.about, c.cover_url, c.price_amount, c.price_currency, c.price_interval,
         (select count(*) from public.members m where m.community_id = c.id),
         (select count(*) from public.courses k where k.community_id = c.id and k.published),
         (select count(*) from public.events e where e.community_id = c.id and e.starts_at > now())
    from public.communities c
   where not c.is_private and not c.archived
   order by (select count(*) from public.members m where m.community_id = c.id) desc, c.created_at;
$$;
revoke all on function public.community_directory() from public, anon, authenticated;
grant execute on function public.community_directory() to anon, authenticated;
