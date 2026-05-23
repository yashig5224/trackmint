import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getStripeEnvironment } from "@/lib/stripe";

export type PlanTier = "free" | "pro" | "elite";

export interface SubscriptionRecord {
  id: string;
  status: string;
  price_id: string;
  product_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
  environment: string;
}

const PRO_PRICES = new Set(["pro_monthly", "pro_yearly"]);
const ELITE_PRICES = new Set(["elite_monthly", "elite_yearly"]);

function tierForPrice(priceId?: string): PlanTier {
  if (!priceId) return "free";
  if (ELITE_PRICES.has(priceId)) return "elite";
  if (PRO_PRICES.has(priceId)) return "pro";
  return "free";
}

function isActiveStatus(sub: SubscriptionRecord | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : Infinity;
  const future = end > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status) && future) return true;
  if (sub.status === "canceled" && future) return true;
  return false;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as SubscriptionRecord | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSub]);

  const isActive = isActiveStatus(subscription);
  const tier: PlanTier = isActive ? tierForPrice(subscription?.price_id) : "free";

  return {
    subscription,
    tier,
    isActive,
    isPro: tier === "pro" || tier === "elite",
    isElite: tier === "elite",
    loading,
    refresh: fetchSub,
  };
}
