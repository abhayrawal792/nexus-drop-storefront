# Cloudflare deployment handoff

Nexus Drop is a React/Vite storefront with an Express/tRPC server and Supabase-backed commerce services. The repository now includes a Cloudflare Workers asset proxy in `cloudflare/worker.ts` and a root `wrangler.toml` that serves `dist/public` as a single-page application while forwarding `/api/*` requests to the existing Node backend.

Cloudflare Pages is appropriate for the static storefront build: the production Vite output is `dist/public`, and the build command remains `pnpm build`. Cloudflare Workers can also serve the SPA assets and run a Worker entry point. This repository uses the Workers asset proxy so the browser and API can share one public origin while the existing Express runtime remains the backend. Cloudflare's Workers documentation supports static assets and selective Worker-first routing for `/api/*` paths [1].

## Required deployment setup

1. Build the repository with `pnpm build`.
2. Deploy the Worker using the repository's `wrangler.toml`.
3. Set `BACKEND_ORIGIN` in the Cloudflare Worker environment to the HTTPS origin of the separately deployed Node server, such as a Render service URL. Do not commit this value to the repository.
4. Set the server-side Supabase, Manus OAuth, JWT, Resend, and storage environment variables on the Node backend. Set the corresponding `VITE_*` public values in the frontend build environment only where the application explicitly requires them.
5. Configure the Manus OAuth callback origin and Supabase Auth redirect URLs to use the final public storefront/backend origins before testing login.

## Important limitation

The current Express server is not converted into a native Worker. The proxy is intentional: the server uses Express middleware, session cookies, the Supabase server client, storage helpers, and server-only secrets. A native Worker rewrite would require a separate migration and should not be attempted as a deployment shortcut. Cloudflare's Node compatibility layer provides many Node APIs but does not make every Node server framework and dependency automatically production-compatible [2].

## Local verification

Run `pnpm build` first. If Wrangler is installed in the deployment environment, use `wrangler dev` with a local `BACKEND_ORIGIN` in a private `.dev.vars` file. Never commit `.dev.vars`, API tokens, Supabase service keys, or Resend keys.

## References

[1]: https://developers.cloudflare.com/workers/static-assets/ "Cloudflare Workers Static Assets"
[2]: https://developers.cloudflare.com/workers/runtime-apis/nodejs/ "Cloudflare Workers Node.js compatibility"
[3]: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ "Cloudflare Pages Vite deployment guide"
