const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs sm:text-sm text-amber-900 font-medium">
      ✨ Test mode — use card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC.
    </div>
  );
}
