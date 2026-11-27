import type { Metadata } from "next";
import { CommerceSteps } from "@/features/cart/components/commerce-steps";
import { CheckoutForm, type CheckoutPrefill } from "@/features/orders/components/checkout-form";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout | Lacora",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  let isSignedIn = false;
  let initialValues: CheckoutPrefill | undefined;
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    isSignedIn = Boolean(user);
    if (user) {
      const [{ data: profile }, { data: address }] = await Promise.all([
        supabase
          .from("customer_profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("customer_default_addresses")
          .select("address, city, postal_code")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      initialValues = {
        customerName: profile?.full_name ?? "",
        customerEmail: user.email ?? "",
        customerPhone: profile?.phone ?? "",
        deliveryAddress: address?.address ?? "",
        deliveryCity: address?.city ?? "",
        deliveryPostalCode: address?.postal_code ?? "",
      };
    }
  }

  return (
    <main className="page-shell checkout-page" id="main-content">
      <p className="eyebrow">WhatsApp-assisted order</p>
      <h1 className="page-heading">Checkout</h1>
      <p className="page-intro">
        Review the current offer, delivery fee and payment choices. Stock is reserved only when
        staff confirm your order.
      </p>
      <CommerceSteps current="delivery" />
      <CheckoutForm initialValues={initialValues} isSignedIn={isSignedIn} />
    </main>
  );
}
