// Razorpay loader + checkout helper.
// Loads the Razorpay JS SDK on demand, creates an order via Supabase edge function,
// opens the Razorpay popup, verifies the payment server-side, and activates the plan.

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Failed to load Razorpay")); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface OpenCheckoutOptions {
  planKey: string;            // pro_monthly | pro_yearly | elite_monthly | elite_yearly
  userEmail?: string;
  userName?: string;
  onSuccess?: (result: { tier: string; planName: string; renewalDate: string }) => void;
  onDismiss?: () => void;
  onError?: (err: Error) => void;
}

export async function openRazorpayCheckout(opts: OpenCheckoutOptions) {
  try {
    await loadScript();

    const { data: order, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: { planKey: opts.planKey },
    });
    if (error || !order?.orderId) throw new Error(error?.message || order?.error || "Could not create order");

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "FinTrack AI",
      description: `${order.planName} (${order.cycle})`,
      image: "https://finbee.lovable.app/favicon.ico",
      prefill: { email: opts.userEmail, name: opts.userName },
      theme: { color: "#6366f1" },
      modal: {
        ondismiss: () => opts.onDismiss?.(),
      },
      handler: async (response: any) => {
        try {
          const { data: verify, error: vErr } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              ...response,
              planKey: opts.planKey,
              planName: order.planName,
              cycle: order.cycle,
              tier: order.tier,
              amount: order.amount,
            },
          });
          if (vErr || !verify?.success) throw new Error(vErr?.message || verify?.error || "Verification failed");
          opts.onSuccess?.({ tier: verify.tier, planName: verify.planName, renewalDate: verify.renewalDate });
        } catch (e) {
          opts.onError?.(e as Error);
        }
      },
    });
    rzp.open();
  } catch (e) {
    opts.onError?.(e as Error);
  }
}
