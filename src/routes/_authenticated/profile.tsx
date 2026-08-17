import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, IndianRupee, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import { useAddCredit, useCreditLog, useDeleteCreditEntry, useUpdateUpiId } from "@/lib/data";
import { creditBalance } from "@/lib/derive";
import { inrCompact, isValidUpiId, sanitizeUpiId, shortDate } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Room C67" },
      {
        name: "description",
        content: "Manage your Room C67 profile, UPI payment ID and credit balance.",
      },
      { property: "og:title", content: "Profile — Room C67" },
      {
        property: "og:description",
        content: "Set your UPI ID and track advance/credit balances.",
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

  const trimmed = sanitizeUpiId(upiId);
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

      <CreditSection userId={userId} userName={profile?.name ?? "Someone"} />

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

function CreditSection({ userId, userName }: { userId: string | null; userName: string }) {
  const { data: entries = [] } = useCreditLog();
  const addCredit = useAddCredit(userId ?? "", userName);
  const deleteCredit = useDeleteCreditEntry();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"add" | "use">("add");

  const myEntries = useMemo(
    () => entries.filter((e) => e.user_id === userId),
    [entries, userId],
  );
  const balance = userId ? creditBalance(entries, userId) : 0;

  const submit = () => {
    const value = Number(amount);
    if (!userId || !value || value <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    const signed = mode === "add" ? value : -value;
    const trimmed = note.trim();
    addCredit.mutate(
      { ...(trimmed ? { note: trimmed } : {}), amount: signed },
      {
        onSuccess: () => {
          toast.success(mode === "add" ? "Credit added" : "Credit used");
          setAmount("");
          setNote("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save that."),
      },
    );
  };

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-card">
      <div>
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Wallet className="size-4 text-primary" /> Credit & advance balance
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid a bit extra one month, or want next month's share reduced? Log it here instead of
          tracking an odd manual correction. This carries forward — your Dashboard and Settle Up
          balances already account for it.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-primary/8 px-4 py-3">
        <span className="text-sm font-semibold">Your current credit</span>
        <span
          className={cn(
            "font-display text-xl font-extrabold",
            balance > 0.5 && "text-paid-foreground",
            balance < -0.5 && "text-overdue",
            Math.abs(balance) <= 0.5 && "text-muted-foreground",
          )}
        >
          {inrCompact(balance)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
        <div className="flex rounded-full border p-1 sm:w-fit">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "add" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Add credit
          </button>
          <button
            type="button"
            onClick={() => setMode("use")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "use" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Use credit
          </button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="credit-amount">Amount (₹)</Label>
          <Input
            id="credit-amount"
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="credit-note">Note (optional)</Label>
          <Input
            id="credit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Overpaid August rent"
            className="rounded-2xl"
          />
        </div>
      </div>

      <Button
        className="rounded-full"
        disabled={!amount || Number(amount) <= 0 || addCredit.isPending}
        onClick={submit}
      >
        {addCredit.isPending
          ? "Saving…"
          : mode === "add"
            ? "Add to credit"
            : "Deduct from credit"}
      </Button>

      {myEntries.length > 0 && (
        <ul className="divide-y border-t pt-2">
          {myEntries.slice(0, 6).map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {Number(e.amount) > 0 ? "+" : ""}
                  {inrCompact(Number(e.amount))}
                  {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{shortDate(e.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove entry"
                className="size-7 rounded-full text-muted-foreground hover:text-overdue"
                onClick={() => deleteCredit.mutate(e.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}