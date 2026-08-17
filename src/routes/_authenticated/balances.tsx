import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { UserAvatar } from "@/components/room/UserAvatar";
import { UpiPayButton } from "@/components/room/UpiPayButton";
import { useSession } from "@/hooks/use-session";
import { useCreditLog, useExpenses } from "@/lib/data";
import { creditBalance, pendingDebts, splitsOwedByMe, splitsOwedToMe, sumSplits } from "@/lib/derive";
import { netBalances, simplifyDebts } from "@/lib/settle";
import { inrCompact } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/balances")({
  head: () => ({
    meta: [
      { title: "Settle Up — Room C67" },
      {
        name: "description",
        content: "Simplified roommate balances: the fewest payments needed to clear Room C67 debts.",
      },
      { property: "og:title", content: "Settle Up — Room C67" },
      {
        property: "og:description",
        content: "See who owes whom and settle Room C67 in the fewest possible transfers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BalancesPage,
});

function BalancesPage() {
  const { userId, profiles } = useSession();
  const { data: expenses = [] } = useExpenses();
  const { data: creditEntries = [] } = useCreditLog();

  const debts = pendingDebts(expenses);
  const transfers = simplifyDebts(debts);
  const net = netBalances(debts);
  const owedByMe = sumSplits(splitsOwedByMe(expenses, userId ?? ""));
  const owedToMe = sumSplits(splitsOwedToMe(expenses, userId ?? ""));
  const profileOf = (id: string) => profiles.find((p) => p.id === id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Settle up</h1>
        <p className="text-sm text-muted-foreground">
          {transfers.length
            ? `${transfers.length} payment${transfers.length === 1 ? "" : "s"} clears everything.`
            : "Everyone is square — nothing to settle."}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">You owe</p>
          <AnimatedNumber
            value={owedByMe}
            className="font-display text-2xl font-bold text-pending-foreground"
          />
        </div>
        <div className="rounded-3xl border bg-card p-4 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
          <AnimatedNumber
            value={owedToMe}
            className="font-display text-2xl font-bold text-paid-foreground"
          />
        </div>
      </div>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Sparkles className="size-4 text-primary" /> Simplified transfers
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Chains are collapsed, so nobody pays twice for the same money.
        </p>
        {transfers.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paid-soft px-4 py-6 text-center text-sm font-medium text-paid-foreground">
            All settled. Nice work.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {transfers.map((t, i) => {
              const iPay = t.from === userId;
              const payee = profileOf(t.to);
              return (
                <li
                  key={`${t.from}-${t.to}-${i}`}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-2xl border p-3",
                    (t.from === userId || t.to === userId) && "border-primary/30 bg-primary/5",
                  )}
                >
                  <UserAvatar profile={profileOf(t.from)} size="sm" />
                  <span className="truncate text-sm font-medium">
                    {t.from === userId ? "You" : (profileOf(t.from)?.name ?? "?")}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <UserAvatar profile={payee} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {t.to === userId ? "You" : (payee?.name ?? "?")}
                  </span>
                  <span className="font-display font-bold tabular-nums">{inrCompact(t.amount)}</span>
                  {iPay && (
                    <UpiPayButton
                      payeeVpa={payee?.upi_id ?? null}
                      payeeName={payee?.name ?? "Roommate"}
                      amount={t.amount}
                      note="Room C67 settle up"
                      className="w-full sm:w-auto"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Net position</h2>
        <p className="mt-1 text-xs text-muted-foreground">Includes each person's credit/advance balance.</p>
        <ul className="mt-3 divide-y">
          {profiles.map((p) => {
            const rawValue = net.get(p.id) ?? 0;
            const credit = creditBalance(creditEntries, p.id);
            const value = rawValue + credit;
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <UserAvatar profile={p} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {p.id === userId ? "You" : p.name}
                  {Math.abs(credit) > 0.5 && (
                    <span className="ml-1.5 text-[11px] font-normal text-primary">
                      ({credit > 0 ? "+" : ""}
                      {inrCompact(credit)} credit)
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    value > 0.5 && "text-paid-foreground",
                    value < -0.5 && "text-pending-foreground",
                    Math.abs(value) <= 0.5 && "text-muted-foreground",
                  )}
                >
                  {Math.abs(value) <= 0.5
                    ? "settled"
                    : value > 0
                      ? `gets ${inrCompact(value)}`
                      : `owes ${inrCompact(-value)}`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Mark individual shares paid from the{" "}
          <Link to="/ledger" className="font-medium text-primary underline-offset-2 hover:underline">
            common ledger
          </Link>
          . Manage your credit balance from{" "}
          <Link to="/profile" className="font-medium text-primary underline-offset-2 hover:underline">
            your profile
          </Link>
          .
        </p>
      </section>
    </div>
  );
}