-- Bank connections
CREATE TABLE public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- plaid | setu | perfios | finvu | tink | salt_edge | aa
  provider_account_id TEXT,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings', -- savings | current | credit_card | business
  account_mask TEXT,
  currency TEXT DEFAULT 'INR',
  current_balance NUMERIC,
  available_balance NUMERIC,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | error | disconnected
  sync_frequency TEXT NOT NULL DEFAULT 'daily', -- manual | daily | weekly
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  consent_handle TEXT,
  consent_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank connections"
  ON public.bank_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all bank connections"
  ON public.bank_connections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync log
CREATE TABLE public.bank_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- success | error | partial
  transactions_imported INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_sync_logs TO authenticated;
GRANT ALL ON public.bank_sync_logs TO service_role;
ALTER TABLE public.bank_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON public.bank_sync_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Track which transactions came from a bank sync
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_transactions_bank_connection ON public.transactions(bank_connection_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_sync_logs;