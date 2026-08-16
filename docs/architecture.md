# Nexus Drop Architecture

Nexus Drop uses **Manus OAuth** for customer login, account access, and admin-role checks. This aligns with the requested account experience while preserving the full-stack template’s authenticated session model.

Supabase is the commerce backend. The application uses Supabase Postgres for the product catalog, reviews, coupons, orders, and order items; Supabase Storage for private payment proofs and public product images; and database-level row-level policies for direct Supabase access. The Supabase server key is held only in protected environment configuration, while all storefront database operations pass through authenticated server procedures.

When a signed-in customer places an order or submits a review, the server maps the Manus identity into `profiles.external_user_id`. Admin screens additionally enforce the Manus `admin` role before exposing operational data or actions.
