import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // "signup" or "login"

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Exchange error:", error);
            navigate("/login", { replace: true });
            return;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, monthly_income, primary_goal")
          .eq("id", user.id)
          .maybeSingle();

        // If user has already completed onboarding, always route directly to /app
        if (profile?.onboarding_completed) {
          sessionStorage.removeItem("trackmint_just_signed_up");
          navigate("/app", { replace: true });
          return;
        }

        // Only direct to /onboarding if user is a brand new signup who has not completed onboarding
        const isSignup = type === "signup" || sessionStorage.getItem("trackmint_just_signed_up") === "true";
        if (isSignup && !profile?.onboarding_completed) {
          sessionStorage.removeItem("trackmint_just_signed_up");
          navigate("/onboarding", { replace: true });
        } else {
          // Returning user logging in: ensure onboarding_completed is true and send to /app
          sessionStorage.removeItem("trackmint_just_signed_up");
          await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
          navigate("/app", { replace: true });
        }
      } catch (err) {
        console.error(err);
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Signing you in...
    </div>
  );
}