import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  priceId: string | null;
  planName?: string;
}

export function CheckoutDialog({ open, onOpenChange, priceId, planName }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && !user) {
      onOpenChange(false);
      navigate("/login?redirect=/pricing");
    }
  }, [open, user, navigate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
        <PaymentTestModeBanner />
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Complete your upgrade{planName ? ` to ${planName}` : ""}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Secure checkout powered by Stripe.</p>
        </div>
        <div className="px-2 pb-4 max-h-[70vh] overflow-y-auto">
          {priceId && user && (
            <StripeEmbeddedCheckout
              priceId={priceId}
              customerEmail={user.email ?? undefined}
              userId={user.id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
