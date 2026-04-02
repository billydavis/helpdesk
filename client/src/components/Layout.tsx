import { Outlet, useNavigate, NavLink } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="font-semibold hover:text-muted-foreground">
              Helpdesk
            </NavLink>
            {session?.user.role === Role.admin && (
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                Users
              </NavLink>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session?.user.name}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
