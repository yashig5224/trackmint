import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  country: string | null;
  currency: string | null;
  monthly_income: number | null;
  selected_persona: string | null;
  primary_goal: string | null;
  onboarding_data: Record<string, unknown> | null;
  onboarding_completed: boolean | null;
  financial_score: number | null;
  level: number | null;
  xp: number | null;
  streak: number | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    try {
      console.log("🔍 Loading profile for:", uid);

      const queryPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Profile fetch timeout") }), 5000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log("📄 PROFILE DATA:", data);
      console.log("❌ PROFILE ERROR:", error);

      if (error) {
        setProfile(null);
        return;
      }

      if (!data) {
        // Fallback: create default profile if missing
        const { data: created } = await supabase
          .from("profiles")
          .insert({ id: uid, onboarding_completed: false })
          .select("*")
          .maybeSingle();
        setProfile((created as Profile | null) ?? null);
        return;
      }

      setProfile((data as Profile | null) ?? null);
    } catch (err) {
      console.error("PROFILE FETCH FAILED:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log("🚀 AuthContext Mounted");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log("🔐 AUTH EVENT:", event);
      console.log("👤 SESSION:", sess);

      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        // Critical: Supabase JS onAuthStateChange holds an internal lock.
        // Awaiting queries synchronously inside onAuthStateChange deadlocks PostgREST.
        // We push loadProfile to the next event loop tick and only then resolve loading = false.
        setTimeout(async () => {
          try {
            await loadProfile(sess.user.id);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const initializeAuth = async () => {
      try {
        const {
          data: { session: sess },
          error,
        } = await supabase.auth.getSession();

        console.log("📦 INITIAL SESSION:", sess);
        console.log("📦 INITIAL SESSION ERROR:", error);

        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          await loadProfile(sess.user.id);
        }
      } catch (err) {
        console.error("INITIAL SESSION FAILED:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signOut = async () => {
    console.log("🚪 Signing out");
    sessionStorage.removeItem("trackmint_just_signed_up");

    await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return ctx;
};