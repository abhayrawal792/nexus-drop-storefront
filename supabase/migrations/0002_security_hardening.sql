alter function public.set_updated_at() set search_path = public;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "customers can read their own profiles" on public.profiles;
drop policy if exists "customers can update their own profiles" on public.profiles;
drop policy if exists "customers can read their orders" on public.orders;
drop policy if exists "customers can read their order items" on public.order_items;
drop policy if exists "admins manage catalog" on public.products;
drop policy if exists "admins manage promotions" on public.coupons;
drop policy if exists "admins manage fulfillment" on public.orders;
drop policy if exists "admins manage order items" on public.order_items;

create policy "customers can read their own profiles" on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());
create policy "customers can update their own profiles" on public.profiles for update to authenticated using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());
create policy "customers can read their orders" on public.orders for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy "customers can read their order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders where orders.id = order_items.order_id and (orders.user_id = auth.uid() or private.is_admin())));
create policy "admins manage catalog" on public.products for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage promotions" on public.coupons for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage fulfillment" on public.orders for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage order items" on public.order_items for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop function if exists public.is_admin();
