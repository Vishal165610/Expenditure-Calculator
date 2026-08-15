export type PendingDebt = { from: string; to: string; amount: number };
export type Transfer = { from: string; to: string; amount: number };

/** Reduce all IOUs to the minimum number of payments (Splitwise-style). */
export function simplifyDebts(debts: PendingDebt[]): Transfer[] {
  const net = new Map<string, number>();
  for (const d of debts) {
    if (d.from === d.to || d.amount <= 0) continue;
    net.set(d.from, (net.get(d.from) ?? 0) - d.amount);
    net.set(d.to, (net.get(d.to) ?? 0) + d.amount);
  }

  const debtors = [...net.entries()]
    .filter(([, v]) => v < -0.5)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = [...net.entries()]
    .filter(([, v]) => v > 0.5)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const amount = Math.min(d.amount, c.amount);
    if (amount > 0.5) transfers.push({ from: d.id, to: c.id, amount: Math.round(amount * 100) / 100 });
    d.amount -= amount;
    c.amount -= amount;
    if (d.amount <= 0.5) i++;
    if (c.amount <= 0.5) j++;
  }
  return transfers;
}

export function netBalances(debts: PendingDebt[]) {
  const net = new Map<string, number>();
  for (const d of debts) {
    net.set(d.from, (net.get(d.from) ?? 0) - d.amount);
    net.set(d.to, (net.get(d.to) ?? 0) + d.amount);
  }
  return net;
}
