import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gauge, Megaphone, Plus, Trash2, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import {
  useActivity,
  useAddExpense,
  useAddNotice,
  useCreditLog,
  useDeleteNotice,
  useExpenses,
  useNotices,
  useReadings,
  type Profile,
} from "@/lib/data";
import {
  CATEGORIES,
  MEMBERS,
  cycleProgress,
  fixedShare,
  inr,
  inrCompact,
  readingDue,
  shortDate,
} from "@/lib/room";
import { inCycle, pendingDebts, creditBalance } from "@/lib/derive";
import { netBalances } from "@/lib/settle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Room C67 Expenses" },
      {
        name: "description",
        content:
          "Cycle progress, itemized fixed costs and a quick-add form for Room C67 shared expenses.",
      },
      { property: "og:title", content: "Dashboard — Room C67 Expenses" },
      {
        property: "og:description",
        content: "Cycle progress, fixed cost breakdown and quick expense entry for Room C67.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { userId, profile, profiles } = useSession();
  const { data: expenses = [] } = useExpenses();
  const { data: readings = [] } = useReadings();
  const { data: activity = [] } = useActivity(6);

  const cycle = useMemo(() => cycleProgress(), []);
  const fixed = useMemo(() => fixedShare(readings), [readings]);

  const debts = useMemo(() => pendingDebts(expenses), [expenses]);
  const net = useMemo(() => netBalances(debts), [debts]);
  const { data: creditEntries = [] } = useCreditLog();
  const myCredit = userId ? creditBalance(creditEntries, userId) : 0;
  const rawNet = userId ? (net.get(userId) ?? 0) : 0;
  const myNet = rawNet + myCredit;

  const cycleSpend = expenses
    .filter((e) => inCycle(e.created_at, cycle.start, cycle.end))
    .reduce((s, e) => s + Number(e.amount), 0);

  const elecDue = readingDue(readings, "electricity");
  const gasDue = readingDue(readings, "gas");

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <UserAvatar profile={profile} size="lg" />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Hey {profile?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
        </div>
      </header>

      {(elecDue || gasDue) && (
        <Link
          to="/bills"
          className="flex items-center gap-3 rounded-2xl border border-pending/40 bg-pending-soft px-4 py-3 text-sm font-medium text-pending-foreground"
        >
          <Zap className="size-4 shrink-0" />
          <span className="flex-1">
            Meter reading due for {[elecDue && "electricity", gasDue && "gas"].filter(Boolean).join(" & ")} — log it for this cycle.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Cycle progress */}
      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Gauge className="size-4" /> Current cycle
            </p>
            <p className="mt-1 font-display text-lg font-bold">
              {shortDate(cycle.start)} → {shortDate(new Date(cycle.end.getTime() - 86_400_000))}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-primary">{cycle.daysLeft}</p>
            <p className="text-xs text-muted-foreground">days left</p>
          </div>
        </div>
        <Progress value={cycle.percent} className="mt-4 h-2.5" />
        <p className="mt-2 text-xs text-muted-foreground">
          Day {cycle.day} of {cycle.total} · resets on the 3rd
        </p>
      </section>

      {/* Net balance + cycle spend — this is the single netted figure across every roommate,
          not a sum of each individual IOU (see Settle Up for the full breakdown). */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/balances"
          className="rounded-3xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-float"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="size-3.5" /> Net balance
          </p>
          <AnimatedNumber
            value={Math.abs(myNet)}
            className={cn(
              "mt-1 block font-display text-2xl font-extrabold",
              Math.abs(myNet) <= 0.5 && "text-muted-foreground",
              myNet > 0.5 && "text-paid-foreground",
              myNet < -0.5 && "text-overdue",
            )}
          />
          <p className="text-xs text-muted-foreground">
            {Math.abs(myNet) <= 0.5
              ? "You're settled up"
              : myNet > 0
                ? "owed to you, net of everything"
                : "you owe, net of everything"}
          </p>
          {Math.abs(myCredit) > 0.5 && (
            <p className="mt-1 text-[11px] text-primary">
              includes {inrCompact(Math.abs(myCredit))} {myCredit > 0 ? "credit" : "credit used"}
            </p>
          )}
        </Link>
        <div className="rounded-3xl border bg-card p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground">Room spend this cycle</p>
          <AnimatedNumber
            value={cycleSpend}
            className="mt-1 block font-display text-2xl font-extrabold"
          />
          <p className="text-xs text-muted-foreground">shared expenses only</p>
        </div>
      </section>

      {/* Fixed cost breakdown */}
      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Fixed monthly costs</h2>
          <Link to="/bills" className="text-xs font-semibold text-primary">
            Room bills →
          </Link>
        </div>
        <div className="mt-3 divide-y">
          {fixed.rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="truncate text-xs text-muted-foreground">{row.hint}</p>
              </div>
              <p className="text-xs text-muted-foreground">{inrCompact(row.total)}</p>
              <p className="w-20 text-right text-sm font-semibold tabular-nums">
                {inrCompact(row.perPerson)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/8 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Your share</p>
            <p className="text-xs text-muted-foreground">
              {inr(fixed.total)} split {MEMBERS} ways
            </p>
          </div>
          <AnimatedNumber
            value={fixed.perPerson}
            className="font-display text-xl font-extrabold text-primary"
          />
        </div>
      </section>

      <QuickAdd userId={userId} userName={profile?.name ?? "Someone"} memberIds={profiles.map((p) => p.id)} />

      <NoticeBoardCard userId={userId} userName={profile?.name ?? "Someone"} profiles={profiles} />

      {/* Recent activity */}
      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <UserAvatar profile={profiles.find((p) => p.id === a.actor_id)} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm">{a.description}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {shortDate(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickAdd({
  userId,
  userName,
  memberIds,
}: {
  userId: string | null;
  userName: string;
  memberIds: string[];
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const add = useAddExpense(userId ?? "", userName);

  const value = Number(amount) || 0;
  const per = memberIds.length ? value / memberIds.length : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim() || value <= 0) {
      toast.error("Add a title and an amount first");
      return;
    }
    const share = Math.round((value / memberIds.length) * 100) / 100;
    add.mutate(
      {
        title: title.trim(),
        amount: value,
        category,
        splitMode: "equal",
        splits: memberIds.map((id) => ({ owed_by: id, amount_owed: share })),
      },
      {
        onSuccess: () => {
          toast.success("Expense added", { description: `${title} · split ${memberIds.length} ways` });
          setTitle("");
          setAmount("");
        },
        onError: (err: unknown) =>
          toast.error("Could not save", {
            description: err instanceof Error ? err.message : "Try again",
          }),
      },
    );
  };

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Quick add expense</h2>
        <Link to="/add-expense" className="text-xs font-semibold text-primary">
          Custom split →
        </Link>
      </div>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
        <div className="grid gap-1.5">
          <Label htmlFor="qa-title">What was it for?</Label>
          <Input
            id="qa-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milk, eggs & bread"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="qa-amount">Amount (₹)</Label>
          <Input
            id="qa-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
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
        <div className="grid content-end gap-1.5">
          <Button type="submit" className="rounded-xl" disabled={add.isPending}>
            <Plus className="size-4" /> {add.isPending ? "Saving…" : "Add"}
          </Button>
        </div>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Splits equally — {inr(per)} each across {memberIds.length || MEMBERS} roommates.
      </p>
    </section>
  );
}

function NoticeBoardCard({
  userId,
  userName,
  profiles,
}: {
  userId: string | null;
  userName: string;
  profiles: Profile[];
}) {
  const { data: notices = [] } = useNotices();
  const addNotice = useAddNotice(userId ?? "", userName);
  const deleteNotice = useDeleteNotice();
  const [message, setMessage] = useState("");

  const submit = () => {
    const text = message.trim();
    if (!text) return;
    addNotice.mutate(text, {
      onSuccess: () => {
        setMessage("");
        toast.success("Notice posted");
      },
      onError: () => toast.error("Couldn't post that notice."),
    });
  };

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-base font-bold">
        <Megaphone className="size-4 text-primary" /> Notice board
      </h2>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. Water tank cleaning on Sunday morning"
        rows={2}
        className="mt-3 rounded-2xl"
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          className="rounded-full"
          disabled={!message.trim() || addNotice.isPending}
          onClick={submit}
        >
          Post
        </Button>
      </div>

      {notices.length === 0 ? (
        <p className="mt-3 py-4 text-center text-sm text-muted-foreground">No notices yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notices.slice(0, 4).map((n) => {
            const author = profiles.find((p) => p.id === n.author_id);
            return (
              <li key={n.id} className="flex items-start gap-3 rounded-2xl bg-surface px-3 py-2.5">
                <UserAvatar profile={author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {n.author_id === userId ? "You" : (author?.name ?? "Someone")}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {shortDate(n.created_at)}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug">{n.message}</p>
                </div>
                {n.author_id === userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete notice"
                    className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNotice.mutate(n.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}