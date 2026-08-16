import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChartPie,
  ClipboardList,
  Home,
  LogOut,
  Moon,
  Plus,
  Receipt,
  Scale,
  Sun,
  MoreHorizontal,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession, useTheme } from "@/hooks/use-session";
import { useMarkNotificationsRead, useNotifications } from "@/lib/data";
import { cn } from "@/lib/utils";

// Trimmed from 9 to 6 destinations: Notice Board now lives on Dashboard,
// History is a tab on Analytics, and Personal Expenses is a tab on Ledger ("Expenses").
const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/bills", label: "Room Bills", icon: Receipt },
  { to: "/ledger", label: "Expenses", icon: ClipboardList },
  { to: "/balances", label: "Settle Up", icon: Scale },
  { to: "/analytics", label: "Analytics", icon: ChartPie },
  { to: "/profile", label: "Profile", icon: UserCog },
] as const;

const MOBILE_PRIMARY = ["/dashboard", "/bills", "/balances"];

function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = notifications.filter((n) => !n.read);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && unread.length) markRead.mutate(unread.map((n) => n.id));
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn("border-b px-4 py-3 text-sm last:border-0", !n.read && "bg-accent/40")}
            >
              <p className="leading-snug">{n.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useSession();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const secondary = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to));

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-brand text-lg font-bold text-primary-foreground shadow-float">
            C
          </span>
          <div>
            <p className="font-display text-base font-extrabold leading-none">Room C67</p>
            <p className="mt-1 text-xs text-muted-foreground">Shared expenses</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground",
                pathname === to && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          ))}
        </nav>

        <Link to="/add-expense" className="mt-4">
          <Button className="w-full rounded-xl shadow-float">
            <Plus className="size-4" /> Add expense
          </Button>
        </Link>

        <Link
          to="/profile"
          className="mt-4 flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-accent/60"
        >
          <UserAvatar profile={profile} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.name ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? ""}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              signOut();
            }}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </Link>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur lg:pl-64">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-sm font-bold text-primary-foreground">
              C
            </span>
            <span className="font-display text-base font-extrabold">Room C67</span>
          </div>
          <span className="ml-auto" />
          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <NotificationBell />
          <Link to="/profile" className="lg:hidden">
            <UserAvatar profile={profile} size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:pb-12 lg:pl-4 lg:pt-8">
        <div className="lg:pl-64">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end px-2">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to))
            .slice(0, 2)
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground",
                  pathname === to && "text-primary",
                )}
              >
                <Icon className="size-5" />
                {label.split(" ")[0]}
              </Link>
            ))}

          <div className="flex justify-center">
            <Link to="/add-expense" aria-label="Add expense">
              <span className="mb-2 grid size-13 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-float">
                <Plus className="size-6" />
              </span>
            </Link>
          </div>

          <Link
            to="/balances"
            className={cn(
              "flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground",
              pathname === "/balances" && "text-primary",
            )}
          >
            <Scale className="size-5" />
            Settle
          </Link>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground">
              <MoreHorizontal className="size-5" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl pb-8">
              <SheetTitle className="px-1 text-base">More</SheetTitle>
              <div className="mt-2 grid gap-1">
                {secondary.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-accent/60"
                  >
                    <Icon className="size-4.5 text-primary" />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4.5" /> Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}