import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_color: string;
  upi_id: string | null;
};

export type Split = {
  id: string;
  expense_id: string;
  owed_by: string;
  amount_owed: number;
  status: string;
  requested_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  category: string;
  receipt_url: string | null;
  split_mode: string;
  notes: string | null;
  created_at: string;
  expense_splits: Split[];
};

export type ReadingRow = {
  id: string;
  type: string;
  reading_date: string;
  reading_value: number;
  rate_per_unit: number;
  logged_by: string | null;
  created_at: string;
};

export type Notice = {
  id: string;
  author_id: string;
  message: string;
  created_at: string;
};

export type Activity = {
  id: string;
  actor_id: string;
  action_type: string;
  description: string;
  related_expense_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type Summary = {
  id: string;
  month: number;
  year: number;
  data: {
    totalSpent: number;
    fixedPerPerson: number;
    perPerson: Record<string, number>;
    settled: number;
    unsettled: number;
    expenseCount: number;
  };
  created_at: string;
};

export type PersonalExpense = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  notes: string | null;
  spent_on: string;
  created_at: string;
};

const db = supabase as unknown as {
  from: (table: string) => any;
  storage: typeof supabase.storage;
};

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await db.from("profiles").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await db
        .from("expenses")
        .select("*, expense_splits(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReadings() {
  return useQuery({
    queryKey: ["readings"],
    queryFn: async (): Promise<ReadingRow[]> => {
      const { data, error } = await db
        .from("utility_readings")
        .select("*")
        .order("reading_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: async (): Promise<Notice[]> => {
      const { data, error } = await db
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActivity(limit = 40) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await db
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await db
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useSummaries() {
  return useQuery({
    queryKey: ["summaries"],
    queryFn: async (): Promise<Summary[]> => {
      const { data, error } = await db
        .from("monthly_summaries")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function logActivity(
  actorId: string,
  actionType: string,
  description: string,
  expenseId?: string | null,
) {
  await db.from("activity_log").insert({
    actor_id: actorId,
    action_type: actionType,
    description,
    related_expense_id: expenseId ?? null,
  });
}

export async function notify(
  userId: string,
  actorId: string,
  type: string,
  message: string,
) {
  if (userId === actorId) return;
  await db.from("notifications").insert({ user_id: userId, actor_id: actorId, type, message });
}

export function useAddExpense(userId: string, userName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      amount: number;
      category: string;
      notes?: string;
      splitMode: "equal" | "custom";
      receipt?: File | null;
      splits: { owed_by: string; amount_owed: number }[];
    }) => {
      let receiptUrl: string | null = null;
      if (input.receipt) {
        const path = `${userId}/${Date.now()}-${input.receipt.name.replace(/[^\w.-]/g, "_")}`;
        const up = await db.storage.from("receipts").upload(path, input.receipt);
        if (up.error) throw up.error;
        receiptUrl = path;
      }

      const { data: expense, error } = await db
        .from("expenses")
        .insert({
          title: input.title,
          amount: input.amount,
          paid_by: userId,
          category: input.category,
          notes: input.notes ?? null,
          split_mode: input.splitMode,
          receipt_url: receiptUrl,
        })
        .select()
        .single();
      if (error) throw error;

      const rows = input.splits
        .filter((s) => s.amount_owed > 0)
        .map((s) => ({
          expense_id: expense.id,
          owed_by: s.owed_by,
          amount_owed: s.amount_owed,
          status: s.owed_by === userId ? "paid" : "pending",
          paid_at: s.owed_by === userId ? new Date().toISOString() : null,
        }));
      if (rows.length) {
        const { error: splitError } = await db.from("expense_splits").insert(rows);
        if (splitError) throw splitError;
      }

      await logActivity(userId, "expense_added", `${userName} added "${input.title}"`, expense.id);
      await Promise.all(
        rows
          .filter((r) => r.owed_by !== userId)
          .map((r) =>
            notify(r.owed_by, userId, "expense", `${userName} added "${input.title}" — you owe a share`),
          ),
      );
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useMarkPaid(userId: string, userName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { split: Split; expense: Expense }) => {
      const { error } = await db
        .from("expense_splits")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", input.split.id);
      if (error) throw error;
      await logActivity(
        userId,
        "marked_paid",
        `${userName} settled ₹${Math.round(Number(input.split.amount_owed))} for "${input.expense.title}"`,
        input.expense.id,
      );
      await notify(
        input.expense.paid_by,
        userId,
        "paid",
        `${userName} marked "${input.expense.title}" as paid`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRequestPayment(userId: string, userName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { split: Split; expense: Expense }) => {
      const { error } = await db
        .from("expense_splits")
        .update({ requested_at: new Date().toISOString() })
        .eq("id", input.split.id);
      if (error) throw error;
      await logActivity(
        userId,
        "requested_payment",
        `${userName} nudged for "${input.expense.title}"`,
        input.expense.id,
      );
      await notify(
        input.split.owed_by,
        userId,
        "request",
        `${userName} requested ₹${Math.round(Number(input.split.amount_owed))} for "${input.expense.title}"`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useAddNotice(userId: string, userName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const { error } = await db.from("notices").insert({ author_id: userId, message });
      if (error) throw error;
      await logActivity(userId, "notice", `${userName} posted a notice`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notices"] }),
  });
}

export function useAddReading(userId: string, userName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: "electricity" | "gas";
      reading_date: string;
      reading_value: number;
      rate_per_unit: number;
    }) => {
      const { error } = await db.from("utility_readings").insert({ ...input, logged_by: userId });
      if (error) throw error;
      await logActivity(
        userId,
        "reading",
        `${userName} logged ${input.type} reading ${input.reading_value}`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["readings"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await db.from("notifications").update({ read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSaveSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { month: number; year: number; data: Summary["data"] }) => {
      const { error } = await db
        .from("monthly_summaries")
        .upsert({ ...input }, { onConflict: "month,year" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summaries"] }),
  });
}

export async function receiptUrl(path: string) {
  const { data } = await db.storage.from("receipts").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Update the current user's UPI VPA (e.g. "name@bank"). Pass "" to clear it. */
export function useUpdateUpiId(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (upiId: string) => {
      const trimmed = upiId.trim();
      const { error } = await db
        .from("profiles")
        .update({ upi_id: trimmed || null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

/** Personal expenses are private per-user records — RLS keeps them scoped to their owner. */
export function usePersonalExpenses(userId: string) {
  return useQuery({
    queryKey: ["personal-expenses", userId],
    queryFn: async (): Promise<PersonalExpense[]> => {
      const { data, error } = await db
        .from("personal_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useAddPersonalExpense(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      amount: number;
      category: string;
      spentOn: string;
      notes?: string;
    }) => {
      const { error } = await db.from("personal_expenses").insert({
        user_id: userId,
        title: input.title,
        amount: input.amount,
        category: input.category,
        spent_on: input.spentOn,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-expenses", userId] }),
  });
}

export function useDeletePersonalExpense(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("personal_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-expenses", userId] }),
  });
}