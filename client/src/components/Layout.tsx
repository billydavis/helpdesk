import { Outlet, useNavigate, NavLink } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Inbox, Users, LogOut } from "lucide-react";

export default function Layout() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:no-underline ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-sidebar">
        {/* Wordmark */}
        <div className="flex h-16 items-center px-5 border-b border-border">
          <NavLink
            to="/"
            className="font-display text-lg font-bold tracking-tight text-foreground hover:no-underline"
          >
            Help<span className="text-primary">desk</span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={navLinkClass}>
            <Inbox className="h-4 w-4" />
            Tickets
          </NavLink>
          {session?.user.role === Role.admin && (
            <NavLink to="/users" className={navLinkClass}>
              <Users className="h-4 w-4" />
              Users
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground truncate">{session?.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground px-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content — offset for sidebar */}
      <main className="ml-56 flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
