-- Default privileges on this project grant broad table access to anon/authenticated,
-- which defeats column-level grants. Strip everything, then re-grant only what the app needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

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
-- point_log: no client access at all (read through leaderboard()).
