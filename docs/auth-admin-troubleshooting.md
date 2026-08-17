# Authentication and admin access handoff

Customer authentication uses Supabase Email OTP. The OTP exchange endpoint verifies the Supabase access token, creates or updates the application user with `loginMethod = supabase_email_otp`, and creates the normal application session. It never writes an administrator role. New customer accounts therefore remain customer accounts unless an administrator explicitly changes the stored role in the database.

The `/admin` route is protected twice: the frontend route checks the authenticated application's stored role, and server procedures use the admin-only tRPC guard. A customer session cannot open administrator statistics or catalog procedures; this behavior is covered by `server/admin.access.test.ts`.

The reported OAuth `permission_denied: oauth state user mismatch` condition is an external OAuth transaction mismatch rather than a customer-role escalation. The launcher derives the callback URL from the current browser origin and sends a one-time nonce in both the state payload and an `__Host-` cookie. The user must start a fresh login from the final public origin, avoid reusing an old callback URL, and configure that exact origin/callback in the Manus OAuth application. After a public Cloudflare/Render origin is chosen, update the OAuth allow-list and Supabase Auth redirect URLs to the exact HTTPS origin. Do not bypass state validation or promote users based on owner identity.

For manual admin assignment, update the existing application's stored user role directly through the database management interface or an approved SQL operation. The application intentionally does not auto-promote the project owner or any Supabase OTP user.
