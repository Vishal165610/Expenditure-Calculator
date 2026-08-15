import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const toast = {
  success: (..._args: unknown[]) => undefined,
  error: (..._args: unknown[]) => undefined,
};
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { useSession } from "@/hooks/use-session";
import {
  useAddPersonalExpense,
  useDeletePersonalExpense,
  usePersonalExpenses,
} from "@/lib/data";
import { inrCompact, PERSONAL_CATEGORIES, shortDate } from "@/lib/room";

export const Route = createFileRoute("/_authenticated/personal-expenses")({
  head: () => ({
    meta: [
      { title: "My Expenses — Room C67" },
      {
        name: "description",
        content: "Your private personal spending, separate from shared Room C67 expenses.",
      },
      { property: "og:title", content: "My Expenses — Room C67" },
      {
        property: "og:description",
        content: "Track your own spending — only visible to you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonalExpensesPage,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PersonalExpensesPage() {
  const { userId } = useSession();
  const { data: entries = [], isLoading } = usePersonalExpenses(userId ?? "");
  const addExpense = useAddPersonalExpense(userId ?? "");
  const deleteExpense = useDeletePersonalExpense(userId ?? "");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(PERSONAL_CATEGORIES[0]!);
  const [spentOn, setSpentOn] = useState(todayISO());

  const thisMonth = useMemo(() => {
    const now = new Date();
    return entries.filter((e) => {
      const d = new Date(e.spent_on);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [entries]);

  const monthTotal = thisMonth.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of thisMonth) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [thisMonth]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount) || 0;
    if (!userId || !title.trim() || value <= 0) {
      toast.error("Add a title and an amount first");
      return;
    }
    addExpense.mutate(
      { title: title.trim(), amount: value, category, spentOn },
      {
        onSuccess: () => {
          toast.success("Logged");
          setTitle("");
          setAmount("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't save that."),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <Wallet className="size-6 text-primary" /> My expenses
        </h1>
        <p className="text-sm text-muted-foreground">
          Private to you — never shows up in the shared room ledger.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">This month</p>
          <AnimatedNumber value={monthTotal} className="font-display text-2xl font-bold" />
          <p className="text-xs text-muted-foreground">
            {thisMonth.length} {thisMonth.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="rounded-3xl border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Top category</p>
          <p className="font-display text-2xl font-bold">{byCategory[0]?.[0] ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {byCategory[0] ? inrCompact(byCategory[0][1]) : "No spend yet"}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Log an expense</h2>
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pe-title">What was it?</Label>
            <Input
              id="pe-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Movie tickets"
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-amount">Amount (₹)</Label>
            <Input
              id="pe-amount"
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
            <Label htmlFor="pe-date">Date</Label>
            <Input
              id="pe-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="rounded-full sm:col-span-2" disabled={addExpense.isPending}>
            <Plus className="size-4" /> {addExpense.isPending ? "Saving…" : "Add expense"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">History</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && entries.length === 0 && (
          <p className="mt-3 py-8 text-center text-sm text-muted-foreground">
            Nothing logged yet — add your first personal expense above.
          </p>
        )}
        <ul className="mt-2 divide-y">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {shortDate(e.spent_on)} · {e.category}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {inrCompact(Number(e.amount))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-overdue"
                aria-label="Delete entry"
                onClick={() =>
                  deleteExpense.mutate(e.id, {
                    onSuccess: () => toast.success("Removed"),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}