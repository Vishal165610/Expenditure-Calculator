import { IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildUpiLink } from "@/lib/room";
import { cn } from "@/lib/utils";

const toast = {
  info: (..._args: unknown[]) => undefined,
  error: (..._args: unknown[]) => undefined,
};

/**
 * Renders a "Pay via UPI" action for a given payee.
 * - On Android, follows the `upi://pay` deep link and opens the device's UPI app picker.
 * - On desktop (no UPI apps to hand off to), copies the VPA and lets the user pay from their phone.
 * - If the payee hasn't set a UPI ID yet, renders a disabled hint instead.
 */
export function UpiPayButton({
  payeeVpa,
  payeeName,
  amount,
  note,
  size = "sm",
  variant = "default",
  className,
}: {
  payeeVpa?: string | null;
  payeeName: string;
  amount: number;
  note?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  className?: string;
}) {
  if (!payeeVpa) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        title={`${payeeName} hasn't added a UPI ID yet`}
        className={cn("rounded-full", className)}
      >
        No UPI ID
      </Button>
    );
  }

  const link = buildUpiLink({
    payeeVpa,
    payeeName,
    amount,
    ...(note !== undefined ? { note } : {}),
  });
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const handleClick = (e: React.MouseEvent) => {
    if (isAndroid) return; // let the <a href> do its job — opens the UPI app picker
    e.preventDefault();
    navigator.clipboard
      .writeText(payeeVpa)
      .then(() => {
        toast.info(`Copied ${payeeVpa}`, {
          description: `Open your UPI app on your phone to pay ₹${Math.round(amount)} to ${payeeName}.`,
        });
      })
      .catch(() => toast.error("Couldn't copy the UPI ID"));
  };

  return (
    <Button asChild size={size} variant={variant} className={cn("rounded-full", className)}>
      <a href={link} onClick={handleClick}>
        <IndianRupee className="size-3.5" /> Pay via UPI
      </a>
    </Button>
  );
}