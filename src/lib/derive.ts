import type { CreditEntry, Expense, Split } from "./data";
import type { PendingDebt } from "./settle";

/** Every unsettled split becomes an IOU from the debtor to the payer. */
export function pendingDebts(expenses: Expense[]): PendingDebt[] {
  const out: PendingDebt[] = [];
  for (const e of expenses) {
    for (const s of e.expense_splits ?? []) {
      if (s.status === "paid" || s.owed_by === e.paid_by) continue;
      out.push({ from: s.owed_by, to: e.paid_by, amount: Number(s.amount_owed) });
    }
  }
  return out;
}

export type SplitRow = { expense: Expense; split: Split };

export function splitsOwedByMe(expenses: Expense[], userId: string): SplitRow[] {
  const rows: SplitRow[] = [];
  for (const e of expenses) {
    for (const s of e.expense_splits ?? []) {
      if (s.owed_by === userId && s.status !== "paid" && e.paid_by !== userId) {
        rows.push({ expense: e, split: s });
      }
    }
  }
  return rows;
}

export function splitsOwedToMe(expenses: Expense[], userId: string): SplitRow[] {
  const rows: SplitRow[] = [];
  for (const e of expenses) {
    if (e.paid_by !== userId) continue;
    for (const s of e.expense_splits ?? []) {
      if (s.owed_by !== userId && s.status !== "paid") rows.push({ expense: e, split: s });
    }
  }
  return rows;
}

export const sumSplits = (rows: SplitRow[]) =>
  rows.reduce((sum, r) => sum + Number(r.split.amount_owed), 0);

export function inCycle(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function categoryTotals(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthlyTotals(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + Number(e.amount));
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      return {
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short" }),
        value,
      };
    });
}

export function spendByPerson(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + Number(e.amount));
  return map;
}

/**
 * Net credit/advance balance for one user, summed from the credit ledger.
 * Positive = they've prepaid and are owed that much back / it offsets what they owe.
 * Negative would mean more credit was consumed than added (shouldn't normally happen
 * if entries are only added honestly, but the math handles it either way).
 */
export function creditBalance(entries: CreditEntry[], userId: string) {
  return entries
    .filter((e) => e.user_id === userId)
    .reduce((sum, e) => sum + Number(e.amount), 0);
}