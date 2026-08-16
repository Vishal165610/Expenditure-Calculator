import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, History as HistoryIcon, Save } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell as RechartsCell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import {
  useActivity,
  useExpenses,
  useReadings,
  useSaveSummary,
  useSummaries,
  type Expense,
  type Profile,
  type ReadingRow,
} from "@/lib/data";
import { categoryTotals, inCycle, monthlyTotals, spendByPerson } from "@/lib/derive";
import {
  closedCycles,
  cycleProgress,
  fixedShare,
  inrCompact,
  MEMBERS,
  monthLabel,
  shortDate,
} from "@/lib/room";

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Room C67" },
      {
        name: "description",
        content: "Spending trends, category breakdowns and monthly close-out history for Room C67.",
      },
      { property: "og:title", content: "Analytics — Room C67" },
      {
        property: "og:description",
        content: "Visualise Room C67 spending and review past monthly close-outs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { userId, profiles } = useSession();
  const { data: expenses = [] } = useExpenses();
  const { data: readings = [] } = useReadings();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Where the room's money goes, and where it went.</p>
      </header>

      <Tabs defaultValue="charts">
        <TabsList className="rounded-full">
          <TabsTrigger value="charts" className="rounded-full">
            Charts
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-5">
          <ChartsTab userId={userId} profiles={profiles} expenses={expenses} readings={readings} />
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <HistoryTab userId={userId} profiles={profiles} expenses={expenses} readings={readings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartsTab({
  userId,
  profiles,
  expenses,
  readings,
}: {
  userId: string | null;
  profiles: Profile[];
  expenses: Expense[];
  readings: ReadingRow[];
}) {
  const categories = categoryTotals(expenses);
  const months = monthlyTotals(expenses);
  const byPerson = spendByPerson(expenses);
  const fixed = fixedShare(readings);
  const totalShared = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const elecCycles = closedCycles(readings, "electricity").slice(-6);
  const gasCycles = closedCycles(readings, "gas").slice(-6);
  const utilityData = elecCycles.map((c, i) => ({
    label: new Date(c.to).toLocaleDateString("en-IN", { month: "short" }),
    electricity: Math.round(c.total),
    gas: Math.round(gasCycles[i]?.total ?? 0),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Shared spend" value={totalShared} />
        <Stat label="Fixed this month" value={fixed.total} />
        <Stat label="Your fixed share" value={fixed.perPerson} />
        <Stat label="Expenses logged" value={expenses.length} format={(n) => String(Math.round(n))} />
      </div>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Monthly shared spend</h2>
        {months.length === 0 ? (
          <Empty />
        ) : (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v) => inrCompact(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  fontSize={12}
                />
                <Tooltip formatter={(v) => inrCompact(Number(v))} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">By category</h2>
          {categories.length === 0 ? (
            <Empty />
          ) : (
            <>
              <div className="mt-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {categories.map((c, i) => (
                        <RechartsCell
                          key={c.name}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => inrCompact(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {categories.slice(0, 5).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="font-medium tabular-nums">{inrCompact(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Who paid what</h2>
          <ul className="mt-3 divide-y">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <UserAvatar profile={p} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {p.id === userId ? "You" : p.name}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {inrCompact(byPerson.get(p.id) ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Fixed bills are always split {MEMBERS} ways, so they are excluded here.
          </p>
        </section>
      </div>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Metered utilities</h2>
        {utilityData.length === 0 ? (
          <Empty text="Log two meter readings to see utility trends." />
        ) : (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilityData}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v) => inrCompact(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  fontSize={12}
                />
                <Tooltip formatter={(v) => inrCompact(Number(v))} />
                <Bar dataKey="electricity" radius={[8, 8, 0, 0]} fill="var(--color-chart-1)" />
                <Bar dataKey="gas" radius={[8, 8, 0, 0]} fill="var(--color-chart-3)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryTab({
  userId,
  profiles,
  expenses,
  readings,
}: {
  userId: string | null;
  profiles: Profile[];
  expenses: Expense[];
  readings: ReadingRow[];
}) {
  const { data: activity = [] } = useActivity(60);
  const { data: summaries = [] } = useSummaries();
  const saveSummary = useSaveSummary();

  const cycle = cycleProgress();
  const fixed = fixedShare(readings);

  const cycleExpenses = useMemo(
    () => expenses.filter((e) => inCycle(e.created_at, cycle.start, cycle.end)),
    [expenses, cycle.start, cycle.end],
  );

  const totalSpent = cycleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const splits = cycleExpenses.flatMap((e) => e.expense_splits ?? []);
  const settled = splits.filter((s) => s.status === "paid").reduce((s, x) => s + Number(x.amount_owed), 0);
  const unsettled = splits
    .filter((s) => s.status !== "paid")
    .reduce((s, x) => s + Number(x.amount_owed), 0);

  const perPerson: Record<string, number> = {};
  for (const p of profiles) {
    const share = splits
      .filter((s) => s.owed_by === p.id)
      .reduce((sum, s) => sum + Number(s.amount_owed), 0);
    perPerson[p.id] = share + fixed.perPerson;
  }

  const label = monthLabel(cycle.start.getMonth() + 1, cycle.start.getFullYear());

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push(`Room C67 close-out,${label}`);
    lines.push("");
    lines.push("Fixed bills,Total,Per person");
    for (const row of fixed.rows) lines.push(`${row.label},${row.total},${row.perPerson.toFixed(2)}`);
    lines.push("");
    lines.push("Shared expenses,Date,Paid by,Category,Amount");
    for (const e of cycleExpenses) {
      lines.push(
        [
          `"${e.title.replace(/"/g, "'")}"`,
          shortDate(e.created_at),
          profiles.find((p) => p.id === e.paid_by)?.name ?? "?",
          e.category,
          Number(e.amount).toFixed(2),
        ].join(","),
      );
    }
    lines.push("");
    lines.push("Roommate,Share this cycle");
    for (const p of profiles) lines.push(`${p.name},${(perPerson[p.id] ?? 0).toFixed(2)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `room-c67-${label.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const exportPdf = () => {
    const win = window.open("", "_blank", "noopener,width=820,height=1000");
    if (!win) {
      toast.error("Allow pop-ups to export the PDF.");
      return;
    }
    const rows = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    win.document.write(`<!doctype html><html><head><title>Room C67 — ${label}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;color:#1c1c1c}
        h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px}
        p.sub{color:#666;margin:4px 0 0;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        td,th{border-bottom:1px solid #e5e5e5;padding:7px 4px;text-align:left}
        td:last-child,th:last-child{text-align:right}
      </style></head><body>
      <h1>Room C67 — monthly close-out</h1>
      <p class="sub">${label} · cycle ${shortDate(cycle.start)} to ${shortDate(cycle.end)} · split ${MEMBERS} ways</p>
      <h2>Fixed bills</h2><table><tr><th>Item</th><th>Total</th><th>Per person</th></tr>
      ${fixed.rows.map((r) => rows([r.label, inrCompact(r.total), inrCompact(r.perPerson)])).join("")}
      ${rows(["<b>Total</b>", `<b>${inrCompact(fixed.total)}</b>`, `<b>${inrCompact(fixed.perPerson)}</b>`])}
      </table>
      <h2>Shared expenses (${cycleExpenses.length})</h2><table><tr><th>Title</th><th>Paid by</th><th>Amount</th></tr>
      ${cycleExpenses
        .map((e) =>
          rows([
            `${e.title}<br><span style="color:#888">${shortDate(e.created_at)} · ${e.category}</span>`,
            profiles.find((p) => p.id === e.paid_by)?.name ?? "?",
            inrCompact(Number(e.amount)),
          ]),
        )
        .join("")}
      ${rows(["<b>Total</b>", "", `<b>${inrCompact(totalSpent)}</b>`])}
      </table>
      <h2>Per roommate</h2><table><tr><th>Roommate</th><th>Share</th></tr>
      ${profiles.map((p) => rows([p.name, inrCompact(perPerson[p.id] ?? 0)])).join("")}
      </table>
      <h2>Settlement</h2><table>
      ${rows(["Settled", inrCompact(settled)])}${rows(["Outstanding", inrCompact(unsettled)])}
      </table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const save = () =>
    saveSummary.mutate(
      {
        month: cycle.start.getMonth() + 1,
        year: cycle.start.getFullYear(),
        data: {
          totalSpent,
          fixedPerPerson: fixed.perPerson,
          perPerson,
          settled,
          unsettled,
          expenseCount: cycleExpenses.length,
        },
      },
      {
        onSuccess: () => toast.success(`${label} archived`),
        onError: () => toast.error("Couldn't archive this month."),
      },
    );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Close out {label}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cycle {shortDate(cycle.start)} – {shortDate(cycle.end)} · {cycleExpenses.length} shared
          expenses
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cell label="Shared spend" value={inrCompact(totalSpent)} />
          <Cell label="Fixed per person" value={inrCompact(fixed.perPerson)} />
          <Cell label="Settled" value={inrCompact(settled)} tone="text-paid-foreground" />
          <Cell label="Outstanding" value={inrCompact(unsettled)} tone="text-pending-foreground" />
        </div>
        <ul className="mt-4 divide-y">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <UserAvatar profile={p} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.id === userId ? "You" : p.name}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {inrCompact(perPerson[p.id] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="outline" className="rounded-full" onClick={exportPdf}>
            <FileText className="size-4" /> PDF
          </Button>
          <Button className="rounded-full" onClick={save} disabled={saveSummary.isPending}>
            <Save className="size-4" /> Archive month
          </Button>
        </div>
      </section>

      {summaries.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Archived months</h2>
          <ul className="mt-3 divide-y">
            {summaries.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {monthLabel(s.month, s.year)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.data.expenseCount} expenses
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {inrCompact(s.data.totalSpent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <HistoryIcon className="size-4 text-primary" /> Activity feed
        </h2>
        {activity.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <UserAvatar profile={profiles.find((p) => p.id === a.actor_id)} size="sm" />
                <p className="min-w-0 flex-1 text-sm leading-snug">{a.description}</p>
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

function Stat({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <AnimatedNumber
        value={value}
        {...(format ? { format } : {})}
        className="font-display text-xl font-bold sm:text-2xl"
      />
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function Empty({ text = "Not enough data yet." }: { text?: string }) {
  return <p className="mt-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}