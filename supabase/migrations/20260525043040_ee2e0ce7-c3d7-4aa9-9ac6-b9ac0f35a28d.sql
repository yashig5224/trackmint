-- Extend subscriptions table with Razorpay fields
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS renewal_date timestamptz;

-- price_id, product_id, stripe_customer_id, stripe_subscription_id were NOT NULL for stripe.
-- Drop those constraints so Razorpay rows can be inserted.
ALTER TABLE public.subscriptions
  ALTER COLUMN price_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Allow users to insert their own subscription rows (used right after payment verification)
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Extend profiles with plan/feature flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS ai_usage_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_enabled boolean DEFAULT false;

-- Extend payments table for Razorpay
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS plan_name text;

DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);