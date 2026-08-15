import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { UserAvatar } from "@/components/room/UserAvatar";
import { useSession } from "@/hooks/use-session";
import { useExpenses, useReadings } from "@/lib/data";
import { categoryTotals, monthlyTotals, spendByPerson } from "@/lib/derive";
import { closedCycles, fixedShare, inrCompact, MEMBERS } from "@/lib/room";

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
        content: "Spending trends by month, category and roommate for Room C67.",
      },
      { property: "og:title", content: "Analytics — Room C67" },
      {
        property: "og:description",
        content: "Visualise Room C67 spending by month, category and who paid.",
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
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Where the room's money goes.</p>
      </header>

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
                        <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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

function Empty({ text = "Not enough data yet." }: { text?: string }) {
  return <p className="mt-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}