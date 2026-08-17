create table if not exists public.customer_email_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email text,
  alert_emails_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.customer_email_preferences enable row level security;
alter table public.customer_email_preferences add column if not exists email text;
create index if not exists customer_email_preferences_profile_idx on public.customer_email_preferences (profile_id);
create unique index if not exists customer_email_preferences_email_idx on public.customer_email_preferences (lower(email)) where email is not null;
