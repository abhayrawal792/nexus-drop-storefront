create extension if not exists pgcrypto;

create type public.profile_role as enum ('customer', 'admin');
create type public.payment_method as enum ('COD', 'eSewa', 'Khalti', 'FonePay');
create type public.payment_status as enum ('pending', 'verified', 'failed');
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  external_user_id text unique,
  full_name text,
  phone text,
  address text,
  city text,
  role public.profile_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2) check (original_price is null or original_price >= price),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  category_id uuid not null references public.categories(id) on delete restrict,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 4 and 800),
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null check (discount_percent between 1 and 30),
  min_spend numeric(10,2) not null default 0,
  max_uses integer,
  current_uses integer not null default 0,
  is_active boolean not null default true,
  expiry_date timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  city text not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  delivery_charge numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  order_status public.order_status not null default 'pending',
  payment_proof_url text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);

create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(is_active, created_at desc);
create index reviews_product_idx on public.reviews(product_id, created_at desc);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "active catalog is publicly readable" on public.products for select using (is_active = true);
create policy "categories are publicly readable" on public.categories for select using (true);
create policy "reviews are publicly readable" on public.reviews for select using (true);
create policy "authenticated shoppers may write reviews" on public.reviews for insert to authenticated with check (auth.uid() is not null);
create policy "customers can read their own profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "customers can update their own profiles" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "customers can read their orders" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "customers can read their order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders where orders.id = order_items.order_id and (orders.user_id = auth.uid() or public.is_admin())));
create policy "admins manage catalog" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage promotions" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage fulfillment" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order items" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = excluded.public;

create policy "public can view product images" on storage.objects for select using (bucket_id = 'product-images');

insert into public.categories (name, slug) values
  ('Jewelry', 'jewelry'),
  ('Watches', 'watches'),
  ('Eyewear', 'eyewear'),
  ('Bags', 'bags')
on conflict (slug) do update set name = excluded.name;

insert into public.products (name, slug, description, price, original_price, discount_percent, category_id, stock_quantity, images, is_featured, is_active) values
  ('Cuban Chain', 'cuban-chain', 'Polished streetwear link chain with an easy-wear clasp.', 999, 1499, 33, (select id from public.categories where slug = 'jewelry'), 12, array['/manus-storage/jewelry_1120ef39.jpeg'], true, true),
  ('Chrono Watch', 'chrono-watch', 'Minimal black chronograph styling for everyday rotation.', 2499, 3499, 29, (select id from public.categories where slug = 'watches'), 8, array['/manus-storage/hero-gadgets_4fcc5ee6.jpeg'], true, true),
  ('Cyberpunk Sunglasses', 'cyberpunk-sunglasses', 'Anti-glare angular frames for bright city days.', 1299, 1799, 28, (select id from public.categories where slug = 'eyewear'), 15, array['/manus-storage/accessories_ead23cac.jpeg'], false, true),
  ('Sling Bag', 'sling-bag', 'Compact urban carry with organized pockets and an adjustable strap.', 1899, 2499, 24, (select id from public.categories where slug = 'bags'), 6, array['/manus-storage/accessories_ead23cac.jpeg'], true, true),
  ('Signet Ring', 'signet-ring', 'Vintage silver-tone signet ring with a low-key sculpted face.', 799, 1099, 27, (select id from public.categories where slug = 'jewelry'), 20, array['/manus-storage/jewelry_1120ef39.jpeg'], false, true)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, original_price = excluded.original_price,
  discount_percent = excluded.discount_percent, category_id = excluded.category_id, stock_quantity = excluded.stock_quantity,
  images = excluded.images, is_featured = excluded.is_featured, is_active = excluded.is_active;

insert into public.coupons (code, discount_percent, min_spend, is_active) values ('NEXUS30', 30, 0, true)
on conflict (code) do update set discount_percent = excluded.discount_percent, is_active = excluded.is_active;
