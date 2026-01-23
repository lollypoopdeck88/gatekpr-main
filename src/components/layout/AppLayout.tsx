import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "./BottomNav";
import { AdminSidebar } from "./AdminSidebar";
import { SpoofBanner } from "./SpoofBanner";
import { ExplorationBanner } from "./ExplorationBanner";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export function AppLayout({
  children,
  requireAuth = true,
  adminOnly = false,
}: AppLayoutProps) {
  const location = useLocation();
  const {
    user,
    profile,
    role,
    isLoading,
    isAdmin,
    isSuperAdmin,
    isSpoofing,
    spoofedUser,
    stopSpoof,
  } = useAuth();

  // Check if user is exploring without an HOA
  const isExploring = user && profile && !profile.hoa_id && !isSuperAdmin;

  // Wait for role to load when accessing dashboard to prevent flash
  const isRoleLoading = location.pathname === "/dashboard" && role === null;

  if (isLoading || isRoleLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <Loader2 className='h-8 w-8 animate-spin text-secondary' />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to='/login' replace />;
  }

  // NOTE: We no longer redirect users without HOA to request-join
  // They can explore the app freely - there just won't be data until
  // they either sign up their HOA or join a community
  if (adminOnly && !isAdmin && !isSuperAdmin) {
    return <Navigate to='/dashboard' replace />;
  }

  // Redirect super_admin users from dashboard to their admin panel
  if (isSuperAdmin && location.pathname === "/dashboard") {
    return <Navigate to='/admin/super' replace />;
  }

  // Admin layout with sidebar
  if (isAdmin) {
    return (
      <div className='flex min-h-screen bg-background'>
        {/* Spoof Banner */}
        {isSpoofing && spoofedUser && (
          <SpoofBanner
            spoofedUser={{
              name: spoofedUser.profile.name,
              email: spoofedUser.profile.email,
            }}
            onExit={stopSpoof}
          />
        )}

        <AdminSidebar />
        <main
          className={`flex-1 lg:ml-64 p-4 lg:p-6 ${
            isSpoofing ? "pt-20 lg:pt-16" : "pt-18 lg:pt-6"
          }`}>
          <div className='max-w-6xl mx-auto'>{children}</div>
        </main>
      </div>
    );
  }

  // Resident layout with bottom nav
  return (
    <div className='flex flex-col min-h-screen bg-background pb-16'>
      {/* Exploration Banner for users without HOA */}
      {isExploring && (
        <ExplorationBanner profileName={profile?.name?.split(" ")[0]} />
      )}

      {/* Spoof Banner for resident view */}
      {isSpoofing && spoofedUser && (
        <SpoofBanner
          spoofedUser={{
            name: spoofedUser.profile.name,
            email: spoofedUser.profile.email,
          }}
          onExit={stopSpoof}
        />
      )}

      <main
        className={`flex-1 p-4 max-w-lg mx-auto w-full ${
          isSpoofing ? "pt-16" : ""
        }`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
