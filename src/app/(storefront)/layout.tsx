import type { ReactNode } from "react";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { MobileNavigation } from "@/components/storefront/mobile-navigation";
import { CartProvider } from "@/features/cart/components/cart-provider";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: Readonly<{ children: ReactNode }>) {
  let customerId: string | null = null;
  let initialItems: { variantId: string; quantity: number }[] = [];
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    customerId = userData.user?.id ?? null;
    if (customerId) {
      const { data } = await supabase
        .from("cart_items")
        .select("variant_id, quantity")
        .eq("user_id", customerId)
        .order("variant_id", { ascending: true })
        .limit(20);
      initialItems = (data ?? []).map((item) => ({
        variantId: item.variant_id,
        quantity: item.quantity,
      }));
    }
  }

  return (
    <CartProvider customerId={customerId} initialItems={initialItems} key={customerId ?? "guest"}>
      <div className="storefront-shell">
        <SiteHeader isSignedIn={customerId !== null} />
        {children}
        <SiteFooter />
        <MobileNavigation isSignedIn={customerId !== null} />
      </div>
    </CartProvider>
  );
}
