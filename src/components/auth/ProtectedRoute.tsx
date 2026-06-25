import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

const ProtectedRoute = ({
  children,
  requireOnboarding = true,
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  console.log("ProtectedRoute");
  console.log("Loading:", loading);
  console.log("User:", user);
  console.log("Profile:", profile);

  // Wait until auth is fully initialized
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  // No authenticated user
  if (!user) {
    console.log("Redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // User exists but profile still loading
  if (user && profile === null) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  // Redirect unfinished onboarding users
  if (
    requireOnboarding &&
    profile &&
    !profile.onboarding_completed
  ) {
    console.log("Redirecting to onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  console.log("Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;