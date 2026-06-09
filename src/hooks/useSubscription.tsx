import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanTier = "free" | "pro" | "elite";

export interface SubscriptionRecord {
  id: string;
  status: string;
  plan_name: string | null;
  billing_cycle: string | null;
  amount: number | null;
  payment_id: string | null;
  order_id: string | null;
  start_date: string | null;
  renewal_date: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_id: string | null;
  pending_plan_change: string | null;
  pending_plan_change_at: string | null;
}

function tierForPriceKey(key?: string | null): PlanTier {
  if (!key) return "free";
  if (key.startsWith("elite") || key.startsWith("ultimate")) return "elite";
  if (key.startsWith("pro")) return "pro";
  return "free";
}

function isActive(sub: SubscriptionRecord | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  const end = sub.renewal_date || sub.current_period_end;
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as SubscriptionRecord | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`subs-${user.id}-${Math.random().toString(36).slice(2, 8)}`);
    channel
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSub]);

  const active = isActive(subscription);
  const tier: PlanTier = active ? tierForPriceKey(subscription?.price_id) : "free";

  return {
    subscription,
    tier,
    isActive: active,
    isPro: tier === "pro" || tier === "elite",
    isElite: tier === "elite",
    loading,
    refresh: fetchSub,
  };
}
