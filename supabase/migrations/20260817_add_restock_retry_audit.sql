create table if not exists public.restock_retry_audit (
  id uuid primary key default gen_random_uuid(),
  restock_request_id uuid not null references public.restock_requests(id) on delete cascade,
  admin_profile_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('single_retry', 'bulk_retry')),
  attempted_at timestamptz not null default now(),
  attempted_count integer not null default 1 check (attempted_count > 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  provider_error text
);

create index if not exists restock_retry_audit_request_idx
  on public.restock_retry_audit (restock_request_id, attempted_at desc);
create index if not exists restock_retry_audit_admin_idx
  on public.restock_retry_audit (admin_profile_id, attempted_at desc);

alter table public.restock_retry_audit enable row level security;
