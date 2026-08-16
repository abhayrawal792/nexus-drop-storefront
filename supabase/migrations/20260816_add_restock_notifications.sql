create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  updated_at timestamptz not null default now(),
  unique (product_id, email)
);

create index if not exists restock_requests_pending_product_idx
  on public.restock_requests (product_id, requested_at)
  where status = 'pending';

create table if not exists public.restock_request_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  email_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists restock_request_attempts_ip_time_idx
  on public.restock_request_attempts (ip_hash, created_at desc);
create index if not exists restock_request_attempts_email_time_idx
  on public.restock_request_attempts (email_hash, created_at desc);

alter table public.restock_requests enable row level security;
alter table public.restock_request_attempts enable row level security;

create or replace function public.consume_restock_request_limit(
  p_ip_hash text,
  p_email_hash text,
  p_now timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_attempts integer;
  email_attempts integer;
begin
  select count(*) into ip_attempts
  from public.restock_request_attempts
  where ip_hash = p_ip_hash and created_at >= p_now - interval '15 minutes';

  select count(*) into email_attempts
  from public.restock_request_attempts
  where email_hash = p_email_hash and created_at >= p_now - interval '24 hours';

  if ip_attempts >= 5 or email_attempts >= 3 then
    return false;
  end if;

  insert into public.restock_request_attempts (ip_hash, email_hash, created_at)
  values (p_ip_hash, p_email_hash, p_now);

  delete from public.restock_request_attempts
  where created_at < p_now - interval '7 days';

  return true;
end;
$$;

revoke all on function public.consume_restock_request_limit(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_restock_request_limit(text, text, timestamptz) to service_role;
