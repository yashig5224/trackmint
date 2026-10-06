-- Performance Optimization: Composite Indexes for Scalability
-- Accelerates AI context builder, transaction lookups, and budget aggregations

CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
  ON public.transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
  ON public.transactions (user_id, type);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month 
  ON public.budgets (user_id, month);

CREATE INDEX IF NOT EXISTS idx_ai_history_user_created 
  ON public.ai_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created 
  ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_deadline 
  ON public.goals (user_id, deadline);
