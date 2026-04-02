import { Navigate } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== Role.admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
