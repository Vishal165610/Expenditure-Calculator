import { Check, Clock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  overdue,
  className,
}: {
  status: string;
  overdue?: boolean;
  className?: string;
}) {
  if (status === "paid") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-paid-soft px-2.5 py-1 text-[11px] font-semibold text-paid-foreground",
          className,
        )}
      >
        <Check className="size-3" /> Paid
      </span>
    );
  }
  if (overdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-overdue-soft px-2.5 py-1 text-[11px] font-semibold text-overdue",
          className,
        )}
      >
        <TriangleAlert className="size-3" /> Overdue
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-pending-soft px-2.5 py-1 text-[11px] font-semibold text-pending-foreground",
        className,
      )}
    >
      <Clock className="size-3" /> Pending
    </span>
  );
}

export function PaidCheck() {
  return (
    <span className="inline-flex size-5 animate-pop-check items-center justify-center rounded-full bg-paid text-background">
      <svg viewBox="0 0 24 24" className="size-3.5 animate-draw-check" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
