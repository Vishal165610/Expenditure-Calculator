import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import { useAddExpense } from "@/lib/data";
import { CATEGORIES, inrCompact } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/add-expense")({
  head: () => ({
    meta: [
      { title: "Add Expense — Room C67" },
      {
        name: "description",
        content: "Log a shared Room C67 expense with equal or custom splits and a receipt.",
      },
      { property: "og:title", content: "Add Expense — Room C67" },
      {
        property: "og:description",
        content: "Split a new roommate expense equally or with custom amounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddExpensePage,
});

function AddExpensePage() {
  const navigate = useNavigate();
  const { userId, profile, profiles } = useSession();
  const addExpense = useAddExpense(userId ?? "", profile?.name ?? "Someone");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [custom, setCustom] = useState(false);
  const [included, setIncluded] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profiles.length && included.length === 0) setIncluded(profiles.map((p) => p.id));
  }, [profiles, included.length]);

  const total = Number(amount) || 0;
  const equalShare = included.length ? total / included.length : 0;

  const splits = useMemo(() => {
    if (!custom)
      return included.map((id) => ({ owed_by: id, amount_owed: Math.round(equalShare * 100) / 100 }));
    return profiles
      .map((p) => ({ owed_by: p.id, amount_owed: Number(customAmounts[p.id]) || 0 }))
      .filter((s) => s.amount_owed > 0);
  }, [custom, included, equalShare, profiles, customAmounts]);

  const assigned = splits.reduce((s, x) => s + x.amount_owed, 0);
  const diff = Math.round((total - assigned) * 100) / 100;
  const valid = title.trim() && total > 0 && splits.length > 0 && Math.abs(diff) < 1;

  const toggle = (id: string) =>
    setIncluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!valid) return;
    const trimmedNotes = notes.trim();
    addExpense.mutate(
      {
        title: title.trim(),
        amount: total,
        category,
        splitMode: custom ? "custom" : "equal",
        receipt,
        splits,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Expense added");
          navigate({ to: "/ledger" });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save that expense."),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Add expense</h1>
        <p className="text-sm text-muted-foreground">
          You paid it — pick who owes you and how much.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-card">
        <div className="space-y-1.5">
          <Label htmlFor="title">What was it?</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekly groceries"
            className="rounded-2xl"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
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
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-2xl"
            placeholder="Anything worth remembering"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt">Receipt (optional)</Label>
          {receipt ? (
            <div className="flex items-center gap-2 rounded-2xl border bg-surface px-3 py-2 text-sm">
              <Paperclip className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{receipt.name}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove receipt"
                className="size-7 rounded-full"
                onClick={() => setReceipt(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Input
              id="receipt"
              type="file"
              accept="image/*,application/pdf"
              className="rounded-2xl"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          )}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">Split</h2>
            <p className="text-xs text-muted-foreground">
              {custom ? "Enter each person's amount" : `Equal — ${inrCompact(equalShare)} each`}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Custom
            <Switch checked={custom} onCheckedChange={setCustom} />
          </label>
        </div>

        <ul className="mt-4 space-y-2">
          {profiles.map((p) => {
            const isIn = included.includes(p.id);
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3",
                  !custom && !isIn && "opacity-50",
                )}
              >
                <UserAvatar profile={p} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {p.id === userId ? `${p.name} (you)` : p.name}
                </span>
                {custom ? (
                  <Input
                    type="number"
                    min="0"
                    value={customAmounts[p.id] ?? ""}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-24 rounded-xl text-right"
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums">
                      {isIn ? inrCompact(equalShare) : "—"}
                    </span>
                    <Switch checked={isIn} onCheckedChange={() => toggle(p.id)} />
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm">
          <span className="text-muted-foreground">Assigned</span>
          <span className="font-semibold tabular-nums">
            {inrCompact(assigned)} / {inrCompact(total)}
          </span>
        </div>
        {total > 0 && Math.abs(diff) >= 1 && (
          <p className="mt-2 text-xs font-medium text-overdue">
            {diff > 0 ? `${inrCompact(diff)} unassigned` : `${inrCompact(-diff)} over the total`}
          </p>
        )}
      </section>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => navigate({ to: "/ledger" })}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 rounded-full"
          disabled={!valid || addExpense.isPending}
          onClick={submit}
        >
          {addExpense.isPending ? "Saving…" : "Save expense"}
        </Button>
      </div>
    </div>
  );
}