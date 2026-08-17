export const MEMBERS = 4;
export const CYCLE_DAY = 3;
export const RENT_TOTAL = 16000;
export const CLEANING_TOTAL = 200;
export const WATER_TOTAL = 400;
export const ELECTRICITY_RATE = 9;
export const GAS_RATE = 50;
export const FIRST_CYCLE_START = "2026-08-03";

export const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);

export const inrCompact = (value: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const avatarClasses: Record<string, string> = {
  teal: "bg-primary/15 text-primary ring-primary/25",
  indigo: "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  amber: "bg-pending/20 text-pending-foreground ring-pending/30",
  rose: "bg-chart-5/15 text-chart-5 ring-chart-5/25",
};

/** Start (3rd of month) of the cycle containing `date`. */
export function cycleStart(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  if (date.getDate() < CYCLE_DAY) d.setMonth(d.getMonth() - 1);
  d.setDate(CYCLE_DAY);
  return d;
}

export function cycleEnd(start: Date): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export const DAY_MS = 86_400_000;

export function daysBetween(a: Date, b: Date) {
  return Math.round(
    (new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
      new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) /
      DAY_MS,
  );
}

export function cycleProgress(now: Date = new Date()) {
  const start = cycleStart(now);
  const end = cycleEnd(start);
  const total = daysBetween(start, end);
  const day = daysBetween(start, now) + 1;
  const daysLeft = daysBetween(now, end);
  return { start, end, total, day, daysLeft, percent: Math.min(100, (day / total) * 100) };
}

export const monthLabel = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

export const relativeDays = (value: string | Date) => daysBetween(new Date(value), new Date());

export const isOverdue = (createdAt: string, status: string) =>
  status === "pending" && relativeDays(createdAt) > 7;

export type Reading = {
  id: string;
  type: "electricity" | "gas" | string;
  reading_date: string;
  reading_value: number;
  rate_per_unit: number;
};

export type ClosedUtilityCycle = {
  type: string;
  from: string;
  to: string;
  units: number;
  rate: number;
  total: number;
  perPerson: number;
};

/** Turn consecutive readings of one utility into closed billing cycles. */
export function closedCycles(readings: Reading[], type: string): ClosedUtilityCycle[] {
  const sorted = readings
    .filter((r) => r.type === type)
    .slice()
    .sort((a, b) => a.reading_date.localeCompare(b.reading_date));
  const out: ClosedUtilityCycle[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const rawUnits = Math.max(0, Number(cur.reading_value) - Number(prev.reading_value));
    // Round to 2dp here so floating-point subtraction (e.g. 45.60000000000001)
    // never leaks into the bill total or the unit display.
    const units = Math.round(rawUnits * 100) / 100;
    const total = units * Number(cur.rate_per_unit);
    out.push({
      type,
      from: prev.reading_date,
      to: cur.reading_date,
      units,
      rate: Number(cur.rate_per_unit),
      total,
      perPerson: total / MEMBERS,
    });
  }
  return out;
}

export function latestClosed(readings: Reading[], type: string) {
  const cycles = closedCycles(readings, type);
  return cycles.length ? cycles[cycles.length - 1]! : null;
}

export function fixedShare(readings: Reading[]) {
  const elec = latestClosed(readings, "electricity");
  const gas = latestClosed(readings, "gas");
  const rows = [
    { label: "Room rent", total: RENT_TOTAL, perPerson: RENT_TOTAL / MEMBERS, hint: "Fixed monthly" },
    {
      label: "Cleaning",
      total: CLEANING_TOTAL,
      perPerson: CLEANING_TOTAL / MEMBERS,
      hint: "Fixed monthly",
    },
    { label: "Water", total: WATER_TOTAL, perPerson: WATER_TOTAL / MEMBERS, hint: "Fixed monthly" },
    {
      label: "Electricity",
      total: elec?.total ?? 0,
      perPerson: elec ? elec.perPerson : 0,
      hint: elec ? `${elec.units} units × ₹${ELECTRICITY_RATE}` : "Awaiting readings",
    },
    {
      label: "Gas",
      total: gas?.total ?? 0,
      perPerson: gas ? gas.perPerson : 0,
      hint: gas ? `${gas.units} units × ₹${GAS_RATE}` : "Awaiting readings",
    },
  ];
  const perPerson = rows.reduce((s, r) => s + r.perPerson, 0);
  const total = rows.reduce((s, r) => s + r.total, 0);
  return { rows, perPerson, total, elec, gas };
}

/** True when today is the 3rd (or later, with no reading logged for this cycle). */
export function readingDue(readings: Reading[], type: string, now: Date = new Date()) {
  const start = cycleStart(now);
  const startISO = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
    start.getDate(),
  ).padStart(2, "0")}`;
  return !readings.some((r) => r.type === type && r.reading_date >= startISO);
}

/** Clean display for a decimal unit count: 45.6 stays 45.6, 45.00 shows as 45. */
export const formatUnits = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
};

export const CATEGORIES = [
  "Groceries",
  "Food & dining",
  "Household",
  "Utilities",
  "Transport",
  "Internet",
  "Repairs",
  "Other",
];

/** Categories offered on the personal expense tracker — broader than shared-room categories. */
export const PERSONAL_CATEGORIES = [
  "Food & dining",
  "Groceries",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Other",
];

/** Loose sanity check for a UPI VPA, e.g. "vishal@okhdfcbank" — not a full spec validator. */
export function isValidUpiId(value: string) {
  return /^[\w.+-]{2,256}@[a-zA-Z][\w.-]{1,64}$/.test(value.trim());
}

/**
 * Strips characters that can survive a copy-paste into the UPI ID field but silently
 * break the deep link — zero-width spaces, non-breaking spaces, stray newlines/tabs —
 * without altering visibly-typed characters.
 */
export function sanitizeUpiId(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim();
}

/**
 * Builds a `upi://pay` deep link per the NPCI UPI linking spec.
 * Opens the Android UPI app picker (GPay / PhonePe / Paytm / etc.) when tapped from a PWA.
 *
 * IMPORTANT: built manually rather than via URLSearchParams. URLSearchParams percent-encodes
 * "@" to "%40", and several UPI apps' deep-link parsers fail to decode that back — they expect
 * `pa=name@bank` with the "@" literal, matching NPCI's own examples.
 */
export function buildUpiLink(input: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note?: string;
}) {
  const pa = sanitizeUpiId(input.payeeVpa);
  const parts = [
    `pa=${pa}`,
    `pn=${encodeURIComponent(input.payeeName)}`,
    `am=${input.amount.toFixed(2)}`,
    `cu=INR`,
  ];
  if (input.note) parts.push(`tn=${encodeURIComponent(input.note.slice(0, 50))}`);
  return `upi://pay?${parts.join("&")}`;
}