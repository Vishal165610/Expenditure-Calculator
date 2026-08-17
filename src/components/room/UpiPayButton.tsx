import { IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildUpiLink, isValidUpiId, sanitizeUpiId } from "@/lib/room";
import { cn } from "@/lib/utils";

/**
 * Renders a "Pay via UPI" action for a given payee.
 * - On Android, follows the `upi://pay` deep link and opens the device's UPI app picker.
 * - On desktop (no UPI apps to hand off to), copies the VPA and lets the user pay from their phone.
 * - If the payee hasn't set a UPI ID yet, or it's malformed, renders a disabled hint instead
 *   of generating a link that will fail on the confirmation screen.
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
  const cleanVpa = payeeVpa ? sanitizeUpiId(payeeVpa) : "";

  if (!cleanVpa) {
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

  if (!isValidUpiId(cleanVpa)) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        title={`${payeeName}'s UPI ID doesn't look valid — ask them to re-check it on their Profile page`}
        className={cn("rounded-full", className)}
      >
        Invalid UPI ID
      </Button>
    );
  }

  const link = buildUpiLink({
    payeeVpa: cleanVpa,
    payeeName,
    amount,
    ...(note !== undefined ? { note } : {}),
  });
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isAndroid) {
      // Installed PWAs (standalone display mode) don't always resolve upi:// intents
      // reliably from a plain <a href> click — explicitly assigning location.href is
      // the more consistent way to trigger the UPI app picker across Android WebViews.
      window.location.href = link;
      return;
    }

    navigator.clipboard
      .writeText(cleanVpa)
      .then(() => {
        toast.info(`Copied ${cleanVpa}`, {
          description: `Open your UPI app on your phone to pay ₹${Math.round(amount)} to ${payeeName}.`,
        });
      })
      .catch(() => toast.error("Couldn't copy the UPI ID"));
  };

  return (
    <Button size={size} variant={variant} className={cn("rounded-full", className)} asChild>
      <a href={link} onClick={handleClick}>
        <IndianRupee className="size-3.5" /> Pay via UPI
      </a>
    </Button>
  );
}