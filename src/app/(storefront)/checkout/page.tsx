import type { Metadata } from "next";
import { CheckoutForm } from "@/features/orders/components/checkout-form";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout | Lakh Ki Chudhiya",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  let isSignedIn = false;
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    isSignedIn = Boolean(data.user);
  }

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">WhatsApp-assisted order</p>
      <h1 className="page-heading">Checkout</h1>
      <p className="page-intro">
        Save your order request first. Staff will confirm stock and delivery; payment stays unpaid
        until confirmed separately.
      </p>
      <CheckoutForm isSignedIn={isSignedIn} />
    </main>
  );
}
