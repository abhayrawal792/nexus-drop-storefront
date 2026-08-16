# Nexus Drop: GitHub and Publishing Handoff

The Nexus Drop source is available in the private GitHub repository at [github.com/abhayrawal792/nexus-drop](https://github.com/abhayrawal792/nexus-drop). The `main` branch contains the multi-page storefront, Supabase database integration, Manus OAuth flow, checkout receipt uploads, and the protected `/admin` workspace.

## Required Configuration

The application requires the server-side `SUPABASE_URL` and `SUPABASE_KEY` environment values that are already configured in this project. Do not commit secret values or `.env` files to GitHub. The deployed project also relies on the existing Supabase schema, storage buckets, and row-level policies applied from the `supabase/migrations` directory.

## Local Development

After cloning the repository, install dependencies with `pnpm install`. Configure the required environment variables in the deployment environment, then run `pnpm dev`. Use `pnpm check` for TypeScript validation, `pnpm test` for automated checks, and `pnpm build` for a production build.

## Going Live

Manus provides the current project’s built-in hosting and preview. To publish the current stable version, open the project’s management panel and select **Publish** after confirming the latest checkpoint. GitHub stores the source and provides an external development history; it does not replace the existing Supabase configuration or Manus-hosted preview. Before publishing, confirm that the merchant QR assets, WhatsApp support number, product catalog, and payment instructions are correct.

## Remaining Manual Inputs

Khalti and FonePay merchant QR assets or merchant IDs have not yet been supplied. Add those verified payment details before advertising those payment methods as fully actionable. Review the published checkout with a real customer test order before accepting public orders.
