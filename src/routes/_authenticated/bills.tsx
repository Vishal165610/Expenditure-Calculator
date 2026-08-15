import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedNumber } from "@/components/room/AnimatedNumber";
import { useSession } from "@/hooks/use-session";
import { useAddReading, useReadings } from "@/lib/data";
import {
  ELECTRICITY_RATE,
  GAS_RATE,
  MEMBERS,
  closedCycles,
  fixedShare,
  inr,
  inrCompact,
  readingDue,
  shortDate,
} from "@/lib/room";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Room Bills — Room C67" },
      {
        name: "description",
        content: "Rent, cleaning, water plus metered electricity and gas readings for Room C67.",
      },
      { property: "og:title", content: "Room Bills — Room C67" },
      {
        property: "og:description",
        content: "Track recurring bills and log monthly meter readings for Room C67.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillsPage,
});

function BillsPage() {
  const { userId, profile } = useSession();
  const { data: readings = [] } = useReadings();
  const fixed = fixedShare(readings);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Room bills</h1>
        <p className="text-sm text-muted-foreground">
          Recurring costs plus metered utilities, always split {MEMBERS} ways.
        </p>
      </header>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">This month</h2>
        <div className="mt-3 divide-y">
          {fixed.rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3">
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
          <p className="text-sm font-semibold">Your monthly share</p>
          <AnimatedNumber
            value={fixed.perPerson}
            className="font-display text-xl font-extrabold text-primary"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <MeterCard
          type="electricity"
          rate={ELECTRICITY_RATE}
          icon={<Zap className="size-4" />}
          userId={userId}
          userName={profile?.name ?? "Someone"}
        />
        <MeterCard
          type="gas"
          rate={GAS_RATE}
          icon={<Flame className="size-4" />}
          userId={userId}
          userName={profile?.name ?? "Someone"}
        />
      </div>
    </div>
  );
}

function MeterCard({
  type,
  rate,
  icon,
  userId,
  userName,
}: {
  type: "electricity" | "gas";
  rate: number;
  icon: React.ReactNode;
  userId: string | null;
  userName: string;
}) {
  const { data: readings = [] } = useReadings();
  const addReading = useAddReading(userId ?? "", userName);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const cycles = closedCycles(readings, type).slice().reverse();
  const due = readingDue(readings, type);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reading = Number(value);
    if (!userId || !reading) {
      toast.error("Enter a meter reading");
      return;
    }
    addReading.mutate(
      { type, reading_date: date, reading_value: reading, rate_per_unit: rate },
      {
        onSuccess: () => {
          toast.success(`${type === "gas" ? "Gas" : "Electricity"} reading saved`);
          setValue("");
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
        <h2 className="flex items-center gap-2 font-display text-base font-bold capitalize">
          {icon} {type}
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          ₹{rate}/unit
        </span>
      </div>

      {due && (
        <p className="mt-3 rounded-2xl bg-pending-soft px-3 py-2 text-xs font-medium text-pending-foreground">
          No reading logged for this cycle yet.
        </p>
      )}

      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor={`${type}-date`}>Date</Label>
          <Input
            id={`${type}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${type}-value`}>Reading</Label>
          <Input
            id={`${type}-value`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="grid content-end">
          <Button type="submit" className="rounded-xl" disabled={addReading.isPending}>
            Log
          </Button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {cycles.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Log two readings to close a billing cycle.
          </p>
        )}
        {cycles.slice(0, 4).map((c) => (
          <div key={`${c.from}-${c.to}`} className="rounded-2xl bg-muted/50 px-3 py-2.5">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>
                {shortDate(c.from)} → {shortDate(c.to)}
              </span>
              <span>{inr(c.total)}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {Number(c.units).toLocaleString(undefined, { maximumFractionDigits: 2 })} units × ₹{c.rate} · {inrCompact(c.perPerson)} each
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}