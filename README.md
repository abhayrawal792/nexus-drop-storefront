# Nexus Drop

Nexus Drop is a dark-mode Nepal streetwear and accessories storefront built with React, TypeScript, Tailwind CSS, tRPC, Supabase, and Manus OAuth. It includes a 24-product catalog, customer wishlist tools, cart and checkout flows, payment-proof handling, private admin operations, analytics, activity exports, review moderation, and responsive layouts.

## Stack

| Area | Technology |
| --- | --- |
| Client | React 19, TypeScript, Tailwind CSS 4, Wouter, Recharts |
| Server | Express, tRPC 11 |
| Auth | Manus OAuth |
| Commerce data | Supabase Postgres and Storage |
| Tests | Vitest |

## Local setup

Install dependencies, create a local environment file, and start the development server.

```bash
pnpm install
pnpm dev
```

The server reads Supabase credentials from server-side environment variables. Do **not** commit them.

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-server-side-supabase-key
JWT_SECRET=your-session-secret
```

The production deployment also supplies the Manus OAuth variables described by the application template. Configure those through the deployment environment rather than source control.

## Validation

Run all checks before creating a deployment or changing the database.

```bash
pnpm exec tsc --noEmit
pnpm test -- --run
pnpm run build
```

## Supabase

The storefront uses Supabase for catalog, customer, wishlist, order, review, activity-log, and storage data. The tracked migration at `supabase/migrations/20260816_add_restock_notifications.sql` adds secure restock-request persistence and an atomic request-rate limiter.

Apply schema changes through the Supabase migration workflow. Never expose a Supabase secret or service-role key in client code.

## Restock notifications

The customer-facing **Notify Me** interaction is available for out-of-stock recommendations. To turn it into real email delivery, configure these server-only environment variables after verifying the sender in Resend:

```bash
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="Nexus Drop <drops@example.com>"
STORE_PUBLIC_URL=https://your-store-domain.example
```

The repository intentionally does not include any live API keys, sender identities, customer email addresses, or generated build output.

## GitHub hygiene

Keep `node_modules`, `.env*`, logs, build output, and generated deployment files out of commits. Product imagery is stored as managed web-project assets and referenced from catalog data rather than checked into the application source tree.
