# Customer OTP authentication research

Supabase officially supports passwordless email login with either a magic link or a numeric one-time password. Email OTP is enabled through the Auth email provider and requires changing the email template to include `{{ .Token }}`. New users are automatically created by `signInWithOtp` unless `shouldCreateUser: false` is supplied. The standard resend interval is 60 seconds and the default OTP expiry is one hour.

Supabase also supports phone OTP, but it requires configuring an SMS provider such as Twilio, Vonage, MessageBird, or TextLocal. That provider may introduce external messaging charges, so phone OTP is not guaranteed to remain zero-cost.

The Supabase Free plan currently includes 50,000 monthly active users, unlimited API requests, 500 MB database storage, and 1 GB file storage. Free projects can pause after one week of inactivity. Email OTP is therefore the most practical free-tier option for Nexus Drop, provided Supabase's email delivery limits are acceptable or a free custom SMTP provider is configured.

Sources:

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/pricing
