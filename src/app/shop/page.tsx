import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Shop | Lakh Ki Chudhiya",
  description: "Browse the handcrafted lac bangle collection.",
};

export default function ShopPage() {
  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">The catalogue</p>
      <h1 className="page-heading">Shop bangles</h1>
      <p className="page-intro">
        Browse finished pieces with verified photographs, size details and current prices.
      </p>
      <EmptyState title="The collection is being prepared">
        Product details will appear here when the first pieces are ready. In the meantime, you can
        read the <Link href="/size-guide">size guide</Link>.
      </EmptyState>
    </main>
  );
}
