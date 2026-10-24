import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        console.log("🔄 AuthCallback started...");
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // "signup" or "login"

        // 1. Check if Supabase client detectSessionInUrl already established session
        let { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData?.session?.user;

        // 2. If no user and code exists, exchange code
        if (!user && code) {
          console.log("Exchanging code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("exchangeCodeForSession warning (code may be processed by client):", error.message);
            const retry = await supabase.auth.getSession();
            user = retry.data.session?.user;
          } else {
            user = data?.user ?? null;
          }
        }

        // 3. Fallback: getUser()
        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user ?? null;
        }

        if (!user) {
          console.warn("No user found after auth callback, redirecting to login");
          if (active) navigate("/login", { replace: true });
          return;
        }

        console.log("✅ AuthCallback resolved user:", user.id);

        // Fetch user's profile to determine destination
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, monthly_income, primary_goal")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        console.log("📄 AuthCallback profile resolved:", profile);

        // Returning user or user who has completed onboarding: always route directly to /app
        const isSignup = type === "signup" || sessionStorage.getItem("trackmint_just_signed_up") === "true";
        if (profile?.onboarding_completed || !isSignup) {
          sessionStorage.removeItem("trackmint_just_signed_up");
          if (!profile?.onboarding_completed) {
            // Auto-heal returning user so they are never prompted again
            await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
          }
          navigate("/app", { replace: true });
          return;
        }

        // Genuine brand-new signup who has not completed onboarding
        sessionStorage.removeItem("trackmint_just_signed_up");
        navigate("/onboarding", { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        if (active) navigate("/login", { replace: true });
      }
    };

    // Trigger callback resolution with short 50ms buffer to let Supabase client init finish cleanly
    const timer = setTimeout(handleCallback, 50);

    // Guaranteed fallback safety redirect (max 4 seconds) so the page never hangs
    const safety = setTimeout(async () => {
      if (!active) return;
      console.warn("AuthCallback safety timer triggered redirect");
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        sessionStorage.removeItem("trackmint_just_signed_up");
        navigate("/app", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 4000);

    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(safety);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-600 font-medium text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p>Signing you in to TrackMint...</p>
      </div>
    </div>
  );
}