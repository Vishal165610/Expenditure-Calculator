import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Paperclip, Plus, Search, Trash2, Wallet } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { StatusBadge } from "@/components/room/StatusBadge";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import {
  receiptUrl,
  proofUrl,
  useAddPersonalExpense,
  useDeletePersonalExpense,
  useExpenses,
  useMarkPaid,
  usePersonalExpenses,
  useRequestPayment,
  type Expense,
} from "@/lib/data";
import { CATEGORIES, inrCompact, isOverdue, PERSONAL_CATEGORIES, shortDate } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Expenses — Room C67" },
      {
        name: "description",
        content: "Shared Room C67 expenses and your own private personal spending log.",
      },
      { property: "og:title", content: "Expenses — Room C67" },
      {
        property: "og:description",
        content: "Browse shared roommate expenses and your personal spending, side by side.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { userId } = useSession();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Shared room spend and your own personal log.</p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/add-expense">
            <Plus className="size-4" /> Add shared expense
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="shared">
        <TabsList className="rounded-full">
          <TabsTrigger value="shared" className="rounded-full">
            Shared ledger
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-full">
            My expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared" className="mt-5">
          <SharedLedgerTab userId={userId} />
        </TabsContent>

        <TabsContent value="personal" className="mt-5">
          <PersonalExpensesTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SharedLedgerTab({ userId }: { userId: string | null }) {
  const { profile, profiles } = useSession();
  const { data: expenses = [], isLoading } = useExpenses();
  const markPaid = useMarkPaid(userId ?? "", profile?.name ?? "Someone");
  const requestPayment = useRequestPayment(userId ?? "", profile?.name ?? "Someone");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState("all");

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? "Unknown";

  const rows = useMemo(() => {
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (query && !e.title.toLowerCase().includes(query.toLowerCase())) return false;
      const splits = e.expense_splits ?? [];
      if (filter === "owe")
        return splits.some((s) => s.owed_by === userId && s.status !== "paid" && e.paid_by !== userId);
      if (filter === "owed")
        return e.paid_by === userId && splits.some((s) => s.owed_by !== userId && s.status !== "paid");
      if (filter === "settled") return splits.every((s) => s.status === "paid");
      return true;
    });
  }, [expenses, category, query, filter, userId]);

  const openReceipt = async (path: string) => {
    const url = await receiptUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Couldn't open that receipt.");
  };

  const openProof = async (path: string) => {
    const url = await proofUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Couldn't open that proof.");
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {expenses.length} shared {expenses.length === 1 ? "expense" : "expenses"} logged.
      </p>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-45 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses"
            className="rounded-full pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everything</SelectItem>
            <SelectItem value="owe">I owe</SelectItem>
            <SelectItem value="owed">Owed to me</SelectItem>
            <SelectItem value="settled">Fully settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading ledger…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed p-10 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first shared expense and it will show up instantly.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            userId={userId ?? ""}
            nameOf={nameOf}
            profiles={profiles}
            onMarkPaid={(split, proof) => markPaid.mutate({ split, expense, proof: proof ?? null })}
            onNudge={(split) => {
              requestPayment.mutate(
                { split, expense },
                { onSuccess: () => toast.success(`Nudged ${nameOf(split.owed_by)}`) },
              );
            }}
            onReceipt={openReceipt}
            onProof={openProof}
          />
        ))}
      </div>
    </div>
  );
}

function ExpenseCard({
  expense,
  userId,
  nameOf,
  profiles,
  onMarkPaid,
  onNudge,
  onReceipt,
  onProof,
}: {
  expense: Expense;
  userId: string;
  nameOf: (id: string) => string;
  profiles: { id: string; name: string; avatar_color: string; username: string }[];
  onMarkPaid: (split: Expense["expense_splits"][number], proof?: File | null) => void;
  onNudge: (split: Expense["expense_splits"][number]) => void;
  onReceipt: (path: string) => void;
  onProof: (path: string) => void;
}) {
  const splits = expense.expense_splits ?? [];
  const payer = profiles.find((p) => p.id === expense.paid_by);
  const pending = splits.filter((s) => s.status !== "paid" && s.owed_by !== expense.paid_by);
  const overdue = pending.some((s) => isOverdue(expense.created_at, s.status));
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});

  return (
    <article
      className={cn(
        "rounded-3xl border bg-card p-4 shadow-card transition-shadow hover:shadow-float sm:p-5",
        overdue && "border-overdue/40",
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar profile={payer} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{expense.title}</p>
          <p className="text-xs text-muted-foreground">
            {payer?.id === userId ? "You" : (payer?.name ?? "Someone")} paid ·{" "}
            {shortDate(expense.created_at)} · {expense.category}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold tabular-nums">
            {inrCompact(Number(expense.amount))}
          </p>
          <StatusBadge
            status={pending.length ? "pending" : "paid"}
            overdue={overdue}
            className="mt-1"
          />
        </div>
      </div>

      {expense.notes && <p className="mt-3 text-sm text-muted-foreground">{expense.notes}</p>}

      <div className="mt-3 divide-y border-t pt-1">
        {splits.map((split) => {
          const isMine = split.owed_by === userId;
          const late = isOverdue(expense.created_at, split.status);
          return (
            <div key={split.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">
                {isMine ? "You" : nameOf(split.owed_by)}
                {split.owed_by === expense.paid_by && (
                  <span className="text-muted-foreground"> (payer)</span>
                )}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {inrCompact(Number(split.amount_owed))}
              </span>
              <StatusBadge status={split.status} overdue={late} />
              {split.status === "paid" && split.proof_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="View payment proof"
                  title="View payment proof"
                  className="size-7 rounded-full text-muted-foreground hover:text-primary"
                  onClick={() => onProof(split.proof_url!)}
                >
                  <Paperclip className="size-3.5" />
                </Button>
              )}
              {split.status !== "paid" && isMine && expense.paid_by !== userId && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    id={`proof-${split.id}`}
                    className="hidden"
                    onChange={(e) =>
                      setProofFiles((prev) => ({ ...prev, [split.id]: e.target.files?.[0] ?? null }))
                    }
                  />
                  <label htmlFor={`proof-${split.id}`}>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-7 rounded-full",
                        proofFiles[split.id] ? "text-primary" : "text-muted-foreground",
                      )}
                      title={
                        proofFiles[split.id]
                          ? `Attached: ${proofFiles[split.id]!.name}`
                          : "Attach payment screenshot (optional)"
                      }
                    >
                      <span>
                        <Paperclip className="size-3.5" />
                      </span>
                    </Button>
                  </label>
                  <Button
                    size="sm"
                    className="h-7 rounded-full px-3"
                    onClick={() => onMarkPaid(split, proofFiles[split.id])}
                  >
                    Mark paid
                  </Button>
                </>
              )}
              {split.status !== "paid" &&
                expense.paid_by === userId &&
                split.owed_by !== userId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3"
                    onClick={() => onNudge(split)}
                  >
                    <Bell className="size-3.5" /> Nudge
                  </Button>
                )}
            </div>
          );
        })}
      </div>

      {expense.receipt_url && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 rounded-full"
          onClick={() => onReceipt(expense.receipt_url!)}
        >
          <Paperclip className="size-3.5" /> View receipt
        </Button>
      )}
    </article>
  );
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PersonalExpensesTab({ userId }: { userId: string | null }) {
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
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4" /> Private to you — never shows up in the shared ledger.
      </p>

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