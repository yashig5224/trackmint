// Polls the subscriptions table until the user's active plan reflects the upgrade,
// so we never redirect into demo mode while the DB write is still propagating.

import { supabase } from "@/integrations/supabase/client";

export async function waitForActivePlan(userId: string, expectedTier: "pro" | "elite", maxAttempts = 12, intervalMs = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from("subscriptions")
      .select("status,price_id,renewal_date,current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.price_id) {
      const key = data.price_id as string;
      const tier = key.startsWith("elite") ? "elite" : key.startsWith("pro") ? "pro" : "free";
      const end = data.renewal_date || data.current_period_end;
      const stillValid = !end || new Date(end).getTime() > Date.now();
      if (stillValid && (tier === expectedTier || (expectedTier === "pro" && tier === "elite"))) {
        return true;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
