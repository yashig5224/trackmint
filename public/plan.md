# Option D — Doable Slice + Self-Host Runbook

## Part 1 — Code changes (executed now)

### 1. New edge function: `payments-webhook`
- Path: `supabase/functions/payments-webhook/index.ts`
- Public endpoint (no JWT) — Razorpay calls it server-to-server.
- Validates `X-Razorpay-Signature` using HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`.
- Idempotency: dedupe by `razorpay_payment_id` against `payments` table before writing.
- Handles events: `payment.captured`, `payment.failed`, `subscription.cancelled`, `subscription.charged`.
- Writes to `payments`, updates `subscriptions`, updates `profiles.current_plan` + tier limits.
- Adds `verify_jwt = false` block in `supabase/config.toml` for this function only.

### 2. Wire `send-email` into real triggers
- **Welcome email** — call from `AuthContext` after first profile load when `created_at` is fresh, or from a new `on-signup` hook. Use `handle_new_user` trigger → enqueue via DB → small invoker. Simpler: client-side one-shot after signup in `Login.tsx`.
- **Payment success** — call from `verify-razorpay-payment` after subscription insert.
- **Subscription cancellation** — call from `cancel-subscription` edge function.
- **Upgrade email** — same path as payment success, template differs by tier change.
- **Monthly report** — defer (needs cron); document in runbook, do not build now.

### 3. Wire `send-push` into real triggers
- Add helper `src/lib/pushTriggers.ts` that invokes `send-push` with templated payloads.
- Hook into:
  - `automationEngine.ts` — on rule execution
  - Budget overspend check in dashboard load
  - Goal milestone hit in `goalIntelligence.ts`
  - Subscription renewal reminder (client-side check on dashboard mount)

### 4. Fix frontend env placeholders
- Cannot edit `.env` (auto-managed). Instead: document the exact values to paste, and make `firebaseMessaging.ts` + `sentry.ts` no-op gracefully when keys are missing (already partially handled — verify).

## Part 2 — Self-host runbook (Markdown doc)

File: `SELF_HOST_RUNBOUT.md` at project root. Contents:

1. **Prereqs** — Supabase CLI, your new Supabase project, Razorpay live keys, Resend domain verified, Firebase service account JSON.
2. **Export from Lovable Cloud**
   - Tables to dump (list of 18 tables with `pg_dump --data-only --table=public.X`)
   - Storage bucket `statements` — manual copy via Supabase Storage API script (provided)
   - Auth users — `auth.users` export via service role
3. **Import to your Supabase**
   - Run all migrations from `supabase/migrations/` in order
   - Restore data dumps
   - Re-upload storage objects
   - Re-create `handle_new_user` trigger on `auth.users`
4. **Deploy edge functions**
   - `supabase functions deploy <name>` for all 17 functions
   - `supabase secrets set` for every secret listed in the report
5. **Swap frontend keys** — update `.env` on your hosting (Vercel/Netlify), rebuild
6. **Configure Razorpay webhook** — point to `https://<your-project>.supabase.co/functions/v1/payments-webhook`
7. **Configure Google OAuth** — in your Supabase dashboard → Auth → Providers
8. **DNS for Resend** — verify sending domain
9. **Disable Lovable Cloud** — Connectors → Lovable Cloud → Disable
10. **Smoke test checklist** — signup, login, Google OAuth, payment, webhook hit, email arrival, push delivery

## Part 3 — Migration report

Appended to runbook:
- Files modified (full list)
- Env vars used (with role: frontend public / edge-function secret)
- Remaining Lovable dependency: `src/integrations/lovable/index.ts` (Google OAuth wrapper) and `src/integrations/supabase/client.ts` (auto-gen) — both removed during self-host step
- Manual deployment steps that cannot be automated from inside Lovable

## Files to create/modify

**Create**
- `supabase/functions/payments-webhook/index.ts`
- `src/lib/pushTriggers.ts`
- `SELF_HOST_RUNBOOK.md`

**Modify**
- `supabase/config.toml` — add `[functions.payments-webhook] verify_jwt = false`
- `supabase/functions/verify-razorpay-payment/index.ts` — invoke `send-email` on success
- `supabase/functions/cancel-subscription/index.ts` — invoke `send-email` on cancel
- `src/pages/Login.tsx` — invoke welcome email after signup
- `src/lib/automationEngine.ts` — invoke push on rule fire
- `src/lib/goalIntelligence.ts` — invoke push on milestone
- `src/pages/Dashboard.tsx` — budget overspend + renewal reminder push checks

## What stays out of scope (acknowledged limits)
- Cannot edit `.env`, `client.ts`, `supabase/config.toml` project-level fields
- Cannot deploy to your own Supabase from here
- Cannot fill `firebase-messaging-sw.js` config (no access to your Firebase web config) — runbook documents the exact lines to edit

Approve to execute, or tell me to drop/swap any step.
