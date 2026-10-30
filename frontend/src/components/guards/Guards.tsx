import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useGetMeQuery } from "../../api/authApi";
import type { Role } from "../../types";
import { Spinner } from "../ui";

/** Resolves the session once, then renders `children` according to auth state. */
function useSession() {
  useGetMeQuery(); // result is mirrored into the auth slice
  return useAppSelector((s) => s.auth);
}

export function ProtectedRoute() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "unknown") return <div className="flex h-full items-center justify-center"><Spinner label="Loading your workspace…" /></div>;
  if (status === "unauthenticated") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useSession();
  if (status === "unknown") return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const user = useAppSelector((s) => s.auth.user);
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
