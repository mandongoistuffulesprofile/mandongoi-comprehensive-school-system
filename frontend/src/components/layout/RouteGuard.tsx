import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import type { Role } from "../../types";
import { Spinner } from "../ui/Basics";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  if (status !== "ready") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-surface-400">
        <Spinner className="w-8 h-8" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-surface-900 mb-1">Access Restricted</h3>
        <p className="text-sm text-surface-500">You don't have permission to view this section.</p>
      </div>
    );
  }
  return <>{children}</>;
}
