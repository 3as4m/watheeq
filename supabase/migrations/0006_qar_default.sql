-- The business is based in Doha: accept Qatari riyal and make it the default currency.
alter table public.communities drop constraint communities_price_currency_check;
alter table public.communities add constraint communities_price_currency_check check (price_currency in ('qar', 'sar', 'usd', 'aed'));
alter table public.communities alter column price_currency set default 'qar';
update public.communities set price_currency = 'qar' where price_amount is null;
