import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import { useUpdateUpiId } from "@/lib/data";
import { isValidUpiId } from "@/lib/room";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Room C67" },
      {
        name: "description",
        content: "Manage your Room C67 profile and UPI payment ID.",
      },
      { property: "og:title", content: "Profile — Room C67" },
      {
        property: "og:description",
        content: "Set your UPI ID so roommates can pay you back directly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, profile, profiles } = useSession();
  const updateUpi = useUpdateUpiId(userId ?? "");
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    setUpiId(profile?.upi_id ?? "");
  }, [profile?.upi_id]);

  const trimmed = upiId.trim();
  const dirty = trimmed !== (profile?.upi_id ?? "");
  const valid = trimmed === "" || isValidUpiId(trimmed);

  const save = () => {
    if (!valid) {
      toast.error("That doesn't look like a UPI ID", {
        description: "It should look like name@bank, e.g. vishal@okhdfcbank",
      });
      return;
    }
    updateUpi.mutate(trimmed, {
      onSuccess: () => toast.success(trimmed ? "UPI ID saved" : "UPI ID removed"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save that."),
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="flex items-center gap-3">
        <UserAvatar profile={profile} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {profile?.name ?? "Profile"}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile?.username ?? ""}</p>
        </div>
      </header>

      <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-card">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <IndianRupee className="size-4 text-primary" /> UPI ID
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Set this once and every "Pay via UPI" button on Settle Up will pay you directly — no
            need to share your ID manually.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="upi">Your VPA</Label>
          <Input
            id="upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@okhdfcbank"
            className="rounded-2xl"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {!valid && (
            <p className="text-xs font-medium text-overdue">
              Should look like name@bank, e.g. vishal@okhdfcbank
            </p>
          )}
          {profile?.upi_id && !dirty && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-paid-foreground">
              <CheckCircle2 className="size-3.5" /> Saved — roommates can pay you directly
            </p>
          )}
        </div>

        <Button
          className="rounded-full"
          disabled={!dirty || !valid || updateUpi.isPending}
          onClick={save}
        >
          {updateUpi.isPending ? "Saving…" : "Save UPI ID"}
        </Button>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Roommates</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Who's set up to receive UPI payments directly.
        </p>
        <ul className="mt-3 divide-y">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <UserAvatar profile={p} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.id === userId ? `${p.name} (you)` : p.name}
              </span>
              <span
                className={
                  p.upi_id
                    ? "text-xs font-medium text-paid-foreground"
                    : "text-xs text-muted-foreground"
                }
              >
                {p.upi_id ? "UPI ready" : "Not set"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}