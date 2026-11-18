import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Collections | Lakh Ki Chudhiya",
  description: "Explore collections of handcrafted lac bangles.",
};

export default function CollectionsPage() {
  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Made to discover</p>
      <h1 className="page-heading">Collections</h1>
      <p className="page-intro">
        Each collection will bring together pieces with a shared colour, technique or occasion.
      </p>
      <EmptyState title="Our collections are taking shape">
        We will share the first collection here once its pieces and details have been confirmed.
      </EmptyState>
    </main>
  );
}
