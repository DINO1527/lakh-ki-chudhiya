import type { Metadata } from "next";
import { CartPageClient } from "@/features/cart/components/cart-page-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your cart | Lakh Ki Chudhiya",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Your selections</p>
      <h1 className="page-heading">Shopping cart</h1>
      <p className="page-intro">
        Review your selected variants and current prices before checkout.
      </p>
      <CartPageClient />
    </main>
  );
}
