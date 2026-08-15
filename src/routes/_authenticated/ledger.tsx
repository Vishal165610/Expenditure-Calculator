import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Paperclip, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/room/StatusBadge";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import {
  receiptUrl,
  useExpenses,
  useMarkPaid,
  useRequestPayment,
  type Expense,
} from "@/lib/data";
import { CATEGORIES, inrCompact, isOverdue, shortDate } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Common Ledger — Room C67" },
      {
        name: "description",
        content: "Every shared expense in Room C67 with splits, receipts and payment status.",
      },
      { property: "og:title", content: "Common Ledger — Room C67" },
      {
        property: "og:description",
        content: "Browse shared roommate expenses, settle your share or nudge for payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const { userId, profile, profiles } = useSession();
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

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Common ledger</h1>
          <p className="text-sm text-muted-foreground">
            {expenses.length} shared {expenses.length === 1 ? "expense" : "expenses"} logged.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/add-expense">
            <Plus className="size-4" /> Add expense
          </Link>
        </Button>
      </header>

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
            onMarkPaid={(split) => markPaid.mutate({ split, expense })}
            onNudge={(split) => {
              requestPayment.mutate(
                { split, expense },
                { onSuccess: () => toast.success(`Nudged ${nameOf(split.owed_by)}`) },
              );
            }}
            onReceipt={openReceipt}
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
}: {
  expense: Expense;
  userId: string;
  nameOf: (id: string) => string;
  profiles: { id: string; name: string; avatar_color: string; username: string }[];
  onMarkPaid: (split: Expense["expense_splits"][number]) => void;
  onNudge: (split: Expense["expense_splits"][number]) => void;
  onReceipt: (path: string) => void;
}) {
  const splits = expense.expense_splits ?? [];
  const payer = profiles.find((p) => p.id === expense.paid_by);
  const pending = splits.filter((s) => s.status !== "paid" && s.owed_by !== expense.paid_by);
  const overdue = pending.some((s) => isOverdue(expense.created_at, s.status));

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
              {split.status !== "paid" && isMine && expense.paid_by !== userId && (
                <Button size="sm" className="h-7 rounded-full px-3" onClick={() => onMarkPaid(split)}>
                  Mark paid
                </Button>
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
