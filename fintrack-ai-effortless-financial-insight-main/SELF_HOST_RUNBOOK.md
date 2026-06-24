# TrackMint — Self-Host Runbook

This document is the manual ops process for moving TrackMint off Lovable Cloud and onto your own infrastructure. It cannot be executed from inside the Lovable editor — these steps require shell access, your own Supabase project, and your own deployment target (Vercel/Netlify/Cloudflare Pages/etc.).

---

## 0. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.180
- `psql` client
- Your own Supabase project (Project Ref, Service Role Key, Anon Key, DB Password)
- Razorpay live keys (`KEY_ID`, `KEY_SECRET`, `WEBHOOK_SECRET`)
- Resend verified sending domain + `RESEND_API_KEY`
- Firebase project + service account JSON (`PROJECT_ID`, `CLIENT_EMAIL`, `PRIVATE_KEY`) + Web Push `VAPID_KEY`
- OpenAI / Gemini / Groq / OpenRouter API keys
- Sentry DSN
- Google OAuth client ID + secret

---

## 1. Export from Lovable Cloud

Lovable Cloud does not allow `pg_dump`. Use CSV-per-table via the dashboard.

Tables (dependency order):

```
profiles, user_roles, subscriptions, payments, transactions, budgets, goals,
ai_history, ai_usage_logs, automation_rules, automation_logs, bank_connections,
bank_sync_logs, statement_imports, notifications, fcm_tokens, feedback,
announcements, admin_audit_log
```

Storage bucket `statements` — download every object via Supabase JS `.storage.from('statements').list()` + `.download()`.

`auth.users` is not exportable — ask Lovable support or accept that users re-signup.

---

## 2. Set up your Supabase project

```sh
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

Create `statements` bucket in Dashboard → Storage (private). Re-upload exported objects.

Import CSVs:

```sh
psql "postgresql://postgres:<DB_PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
  -c "\copy public.<table> FROM './export/<table>.csv' WITH (FORMAT csv, HEADER true)"
```

---

## 3. Deploy edge functions

```sh
supabase functions deploy ai-router
supabase functions deploy parse-statement
supabase functions deploy send-email
supabase functions deploy send-push
supabase functions deploy payments-webhook --no-verify-jwt
supabase functions deploy verify-razorpay-payment
supabase functions deploy create-razorpay-order
supabase functions deploy cancel-subscription
# … plus every other function in supabase/functions/
```

`payments-webhook` MUST use `--no-verify-jwt` — Razorpay has no Supabase JWT.

### Secrets

```sh
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  GEMINI_API_KEY=... \
  GROQ_API_KEY=gsk_... \
  OPENROUTER_API_KEY=sk-or-... \
  RESEND_API_KEY=re_... \
  RAZORPAY_KEY_ID=rzp_live_... \
  RAZORPAY_KEY_SECRET=... \
  RAZORPAY_WEBHOOK_SECRET=... \
  FIREBASE_PROJECT_ID=... \
  FIREBASE_CLIENT_EMAIL=...@...iam.gserviceaccount.com \
  FIREBASE_PRIVATE_KEY="$(cat firebase-private-key.pem)" \
  FIREBASE_VAPID_KEY=BG... \
  SENTRY_DSN=https://...@sentry.io/...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

---

## 4. Frontend env vars (on Vercel / Netlify / Cloudflare Pages)

```
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<REF>
VITE_SENTRY_DSN=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_VAPID_KEY=BG...
```

`.env`, `src/integrations/supabase/client.ts`, and `types.ts` are Lovable-managed. After forking off Lovable:

- Delete `client.ts` and replace with a hand-written `createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)`
- Regenerate types: `supabase gen types typescript --project-id <REF> > src/integrations/supabase/types.ts`

### Service worker

Paste your Firebase web config into `public/firebase-messaging-sw.js` (service workers cannot read `import.meta.env`):

```js
firebase.initializeApp({
  apiKey: "...", projectId: "...", messagingSenderId: "...", appId: "1:...:web:...",
});
```

---

## 5. Razorpay webhook

Razorpay Dashboard → Settings → Webhooks → **Add**:
- URL: `https://<REF>.supabase.co/functions/v1/payments-webhook`
- Secret: same value as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`, `subscription.cancelled`, `subscription.completed`

Test from the dashboard and confirm `200 OK` in function logs.

---

## 6. Google OAuth

Supabase Dashboard → Authentication → Providers → **Google**:
- Enable
- Paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Copy Supabase's Redirect URL into Google Cloud OAuth client's Authorised redirect URIs

Replace Lovable OAuth wrapper in code:

```diff
- import { lovable } from "@/integrations/lovable";
- await supabase.auth.signInWithOAuth("google", { redirect_uri: ... });
+ await supabase.auth.signInWithOAuth({
+   provider: "google",
+   options: { redirectTo: `${window.location.origin}/app` },
+ });
```

Then `rm -rf src/integrations/lovable/`.

---

## 7. Resend domain

Resend Dashboard → Domains → add your domain → add SPF/DKIM DNS records → wait for verification.

Edit `supabase/functions/send-email/index.ts`:

```ts
const FROM_DEFAULT = "TrackMint <hello@yourdomain.com>";
```

Redeploy: `supabase functions deploy send-email`.

---

## 8. Disable Lovable Cloud

In the Lovable editor: **Connectors → Lovable Cloud → Disable Cloud**.

---

## 9. Smoke test checklist

- [ ] Email/password signup → `profiles` row created → welcome email arrives
- [ ] Google OAuth lands on `/app`
- [ ] Password reset email + `/reset-password` works
- [ ] AI Coach responds (ai-router → OpenAI/Gemini/Groq/OpenRouter)
- [ ] Statement upload + parse (parse-statement → Gemini)
- [ ] Razorpay test payment → webhook → payments + subscriptions + profile updated
- [ ] Payment-success email arrives
- [ ] Push notification delivered (after granting permission)
- [ ] Cancel subscription → drops to `free` → cancellation email
- [ ] Sentry receives test error
- [ ] RLS: user A cannot read user B's transactions

---

## Migration report — in-editor changes

**Created**
- `supabase/functions/payments-webhook/index.ts` — Razorpay webhook with HMAC validation + idempotency
- `supabase/functions/send-email/index.ts` — Resend sender (6 templates)
- `supabase/functions/send-push/index.ts` — FCM HTTP v1 sender
- `supabase/functions/_shared/ai-providers.ts` — Multi-provider AI router with plan gating
- `src/lib/pushTriggers.ts` — Client helpers for push + email
- `src/lib/sentry.ts` — Sentry init
- `src/lib/firebaseMessaging.ts` — FCM token registration
- `public/firebase-messaging-sw.js` — FCM service worker
- `supabase/migrations/…_fcm_tokens.sql` — FCM token table

**Modified**
- `supabase/functions/ai-router/index.ts` — uses your OpenAI/Gemini/Groq/OpenRouter keys directly
- `supabase/functions/parse-statement/index.ts` — native Gemini, no Lovable Gateway
- `supabase/functions/verify-razorpay-payment/index.ts` — sends payment-success email
- `supabase/functions/cancel-subscription/index.ts` — sends cancellation email
- `src/pages/Login.tsx` — sends welcome email on signup
- `src/main.tsx` — initialises Sentry

## Env var inventory

### Frontend (public)
| Var | Used by |
|---|---|
| `VITE_SUPABASE_URL` | Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client (anon) |
| `VITE_SUPABASE_PROJECT_ID` | Build metadata |
| `VITE_SENTRY_DSN` | Sentry |
| `VITE_FIREBASE_API_KEY` | Firebase web SDK |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web SDK |
| `VITE_FIREBASE_APP_ID` | Firebase web SDK |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web SDK |
| `VITE_FIREBASE_VAPID_KEY` | Web Push subscription |

### Edge function secrets (server-only)
| Var | Used by |
|---|---|
| `OPENAI_API_KEY` | ai-router (Elite tier) |
| `GEMINI_API_KEY` | ai-router (all tiers) + parse-statement |
| `GROQ_API_KEY` | ai-router (Pro+) |
| `OPENROUTER_API_KEY` | ai-router (Pro+) |
| `RESEND_API_KEY` | send-email |
| `FIREBASE_PROJECT_ID` | send-push |
| `FIREBASE_CLIENT_EMAIL` | send-push (JWT signer) |
| `FIREBASE_PRIVATE_KEY` | send-push (JWT signer) |
| `RAZORPAY_KEY_ID` | create-razorpay-order, payments-webhook |
| `RAZORPAY_KEY_SECRET` | create-razorpay-order, verify-razorpay-payment |
| `RAZORPAY_WEBHOOK_SECRET` | payments-webhook |
| `SENTRY_DSN` | (frontend; add to edge fns if you want server traces) |

## Remaining Lovable dependencies (removed during self-host)

| File | Purpose | Self-host action |
|---|---|---|
| `src/integrations/lovable/` | Managed Google OAuth wrapper | Delete after step 6 |
| `src/integrations/supabase/client.ts` | Auto-generated | Replace by hand |
| `src/integrations/supabase/types.ts` | Auto-generated | Regenerate with `supabase gen types` |
| `.env` (Lovable-managed) | Project keys | Use your host's env settings instead |
| `supabase/config.toml` | Auto-managed | Keep — Supabase CLI uses it |

## Security audit

- ✅ Service role key never imported in frontend
- ✅ Razorpay secret only in edge functions
- ✅ AI provider keys only in edge functions
- ✅ All user-facing edge functions validate JWT via `getClaims()`
- ✅ `payments-webhook` validates HMAC signature instead of JWT
- ✅ All public tables have RLS enabled
- ✅ `user_roles` writes guarded by `prevent_role_self_assignment` trigger
- ⚠️ `firebase-messaging-sw.js` Firebase web config is public by design (not secret)
- ⚠️ `VITE_*` vars end up in the JS bundle — never put anything secret there
