export function PaymentTestModeBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs sm:text-sm text-amber-900 font-medium">
      ✨ Test mode — use Razorpay test card{" "}
      <span className="font-mono">4111 1111 1111 1111</span>, any future expiry, any CVC, OTP{" "}
      <span className="font-mono">1234</span>.
    </div>
  );
}
