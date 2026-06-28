import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export default function ProtectedRoute({
  children,
  requireOnboarding = true,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  console.log("========== ProtectedRoute ==========");
  console.log("Loading:", loading);
  console.log("User:", user);
  console.log("Profile:", profile);

  // ----------------------------
  // Wait for auth initialization
  // ----------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  // ----------------------------
  // User not logged in
  // ----------------------------
  if (!user) {
    console.log("➡ Redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------------
  // Profile still loading
  // (undefined means AuthContext hasn't finished yet)
  // ----------------------------------------------------
  if (profile === undefined) {
    console.log("⏳ Waiting for profile...");

    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  // ----------------------------------------------------
  // Profile missing (should almost never happen)
  // ----------------------------------------------------
  if (profile === null) {
    console.log("❌ Profile not found");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">
          Unable to load your profile
        </h2>

        <p className="text-gray-500">
          Please refresh the page or sign in again.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // User needs onboarding
  // ----------------------------------------------------
  if (
    requireOnboarding &&
    profile.onboarding_completed !== true
  ) {
    console.log("➡ Redirecting to /onboarding");

    return <Navigate to="/onboarding" replace />;
  }

  // ----------------------------------------------------
  // Everything is good
  // ----------------------------------------------------
  console.log("✅ Access granted");

  return <>{children}</>;
}