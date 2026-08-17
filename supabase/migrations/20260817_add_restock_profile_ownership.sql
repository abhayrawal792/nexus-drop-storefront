alter table public.restock_requests add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create index if not exists restock_requests_profile_idx on public.restock_requests (profile_id, requested_at desc);
