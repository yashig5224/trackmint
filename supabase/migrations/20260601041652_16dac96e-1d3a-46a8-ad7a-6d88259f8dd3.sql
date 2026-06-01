
-- Automation Rules (custom user-defined IF/THEN automations)
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_prebuilt BOOLEAN NOT NULL DEFAULT false,
  prebuilt_key TEXT,
  condition_type TEXT NOT NULL,
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  tier TEXT NOT NULL DEFAULT 'pro',
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own automation_rules select" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own automation_rules insert" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own automation_rules update" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own automation_rules delete" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automation_rules_user ON public.automation_rules(user_id);

-- Automation Logs (history of every trigger)
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'success',
  severity TEXT NOT NULL DEFAULT 'info',
  amount_saved NUMERIC DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own automation_logs select" ON public.automation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own automation_logs insert" ON public.automation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own automation_logs delete" ON public.automation_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_automation_logs_user_time ON public.automation_logs(user_id, created_at DESC);
