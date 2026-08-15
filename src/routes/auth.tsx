import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ACCOUNTS = [
  { username: "RTC67", name: "Ritesh", color: "bg-primary/15 text-primary" },
  { username: "vagabond", name: "Yuvraj", color: "bg-chart-4/15 text-chart-4" },
  { username: "aquib", name: "Aquib", color: "bg-pending/20 text-pending-foreground" },
  { username: "scubacatt", name: "Vishal", color: "bg-chart-5/15 text-chart-5" },
];

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Room C67 Expenses" },
      {
        name: "description",
        content: "Sign in to Room C67 to track shared rent, utilities and roommate expenses.",
      },
      { property: "og:title", content: "Sign in — Room C67 Expenses" },
      {
        property: "og:description",
        content: "Sign in to Room C67 to track shared rent, utilities and roommate expenses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("RTC67");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const email = `${username.toLowerCase()}@roomc67.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-warm px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-3xl bg-gradient-brand text-2xl font-bold text-primary-foreground shadow-float">
            C
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Room C67</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared expenses for four roommates.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border bg-card p-5 shadow-card"
        >
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Who&apos;s signing in?
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => setUsername(a.username)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-all",
                  username === a.username
                    ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                    : "hover:bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-xs font-bold",
                    a.color,
                  )}
                >
                  {a.name[0]}
                </span>
                <p className="mt-2 text-sm font-semibold leading-none">{a.name}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">@{a.username}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="mt-5 w-full rounded-xl" disabled={busy}>
            {busy ? "Signing in…" : `Continue as ${username}`}
          </Button>
        </form>
      </div>
    </div>
  );
}
