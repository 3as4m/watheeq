-- Watheeq 0005: paid communities through Stripe Checkout.
--   * A community is free unless it has a price (amount in the currency's minor unit, e.g. halalas).
--   * Paid communities can't be joined with join_community(); access comes from a completed payment,
--     or from an admin adding the member by email (comped).
--   * The Vercel payment functions talk to the database with the publishable key only. The two
--     fulfilment RPCs are gated by a shared secret kept in private.settings and in the Vercel env,
--     so no service-role key has to leave Supabase.

alter table public.communities
  add column price_amount   int check (price_amount is null or price_amount between 100 and 100000000),
  add column price_currency text not null default 'sar' check (price_currency in ('sar', 'usd', 'aed')),
  add column price_interval text check (price_interval in ('one_time', 'month', 'year')),
  add constraint communities_price_complete check ((price_amount is null) = (price_interval is null));

grant update (price_amount, price_currency, price_interval) on public.communities to authenticated;

alter table public.members add column stripe_subscription_id text;
create index members_subscription_idx on public.members (stripe_subscription_id) where stripe_subscription_id is not null;

create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  stripe_ref              text unique not null,          -- checkout session id, or invoice id for renewals
  community_id            uuid references public.communities (id) on delete set null,
  user_id                 uuid references public.profiles (id) on delete set null,
  amount                  int not null,
  currency                text not null,
  kind                    text not null check (kind in ('one_time', 'subscription', 'renewal')),
  stripe_subscription_id  text,
  created_at              timestamptz not null default now()
);
create index payments_community_idx on public.payments (community_id, created_at desc);
create index payments_user_idx on public.payments (user_id);

alter table public.payments enable row level security;
create policy payments_select on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin(community_id));
grant select on public.payments to authenticated;

create schema if not exists private;
create table if not exists private.settings (key text primary key, value text not null);
insert into private.settings (key, value)
values ('payments_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create function public.payments_secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret, '') <> '' and p_secret = (select value from private.settings where key = 'payments_secret');
$$;

-- Paid communities: free joining is refused (the invite page offers checkout instead).
create or replace function public.join_community(cid uuid default null, p_code text default null) returns text
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
  if c.price_amount is not null
     and not exists (select 1 from public.members where community_id = c.id and user_id = (select auth.uid())) then
    raise exception 'هذا المجتمع باشتراك مدفوع';
  end if;
  insert into public.members (community_id, user_id, role) values (c.id, (select auth.uid()), 'member')
    on conflict do nothing;
  return c.slug;
end;
$$;

drop function public.community_by_invite(text);
create function public.community_by_invite(p_code text)
returns table (id uuid, slug text, name text, tagline text, about text, member_count bigint,
               price_amount int, price_currency text, price_interval text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.name, c.tagline, c.about,
         (select count(*) from public.members m where m.community_id = c.id),
         c.price_amount, c.price_currency, c.price_interval
    from public.community_invites i join public.communities c on c.id = i.community_id
   where i.code = p_code and not c.archived;
$$;

-- What the checkout function may sell to the caller: a public paid community, or a private one
-- when the caller holds its invite code. Null when there is nothing to buy.
create function public.community_for_checkout(cid uuid, p_code text default null)
returns table (id uuid, slug text, name text, price_amount int, price_currency text, price_interval text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.name, c.price_amount, c.price_currency, c.price_interval
    from public.communities c
   where c.id = cid and not c.archived and c.price_amount is not null
     and (not c.is_private or exists (select 1 from public.community_invites i where i.community_id = c.id and i.code = p_code))
     and not exists (select 1 from public.members m where m.community_id = c.id and m.user_id = (select auth.uid()));
$$;

-- Called by the payment functions after Stripe confirms a payment. Idempotent per stripe_ref.
create function public.payments_fulfill(p_secret text, p_ref text, p_user uuid, p_community uuid, p_amount int,
                                        p_currency text, p_kind text, p_subscription text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.payments_secret_ok(p_secret) then raise exception 'not allowed'; end if;
  insert into public.payments (stripe_ref, community_id, user_id, amount, currency, kind, stripe_subscription_id)
  values (p_ref, p_community, p_user, p_amount, lower(p_currency), p_kind, p_subscription)
  on conflict (stripe_ref) do nothing;
  if p_kind <> 'renewal' then
    insert into public.members (community_id, user_id, role, stripe_subscription_id)
    values (p_community, p_user, 'member', p_subscription)
    on conflict (community_id, user_id) do update
      set stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.members.stripe_subscription_id);
  end if;
  return true;
end;
$$;

-- A subscription ended (cancelled or unpaid): remove the access it granted. Staff keep their seat.
create function public.payments_end_subscription(p_secret text, p_subscription text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.payments_secret_ok(p_secret) then raise exception 'not allowed'; end if;
  delete from public.members where stripe_subscription_id = p_subscription and role = 'member';
  get diagnostics n = row_count;
  update public.members set stripe_subscription_id = null where stripe_subscription_id = p_subscription;
  return n;
end;
$$;

revoke all on function public.payments_secret_ok(text), public.community_by_invite(text),
  public.community_for_checkout(uuid, text),
  public.payments_fulfill(text, text, uuid, uuid, int, text, text, text), public.payments_end_subscription(text, text)
  from public, anon, authenticated;
grant execute on function public.community_by_invite(text) to anon, authenticated;
grant execute on function public.community_for_checkout(uuid, text) to authenticated;
grant execute on function public.payments_fulfill(text, text, uuid, uuid, int, text, text, text),
  public.payments_end_subscription(text, text) to anon, authenticated;
