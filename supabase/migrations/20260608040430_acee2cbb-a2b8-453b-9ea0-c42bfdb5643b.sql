ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_change text,
  ADD COLUMN IF NOT EXISTS pending_plan_change_at timestamptz;