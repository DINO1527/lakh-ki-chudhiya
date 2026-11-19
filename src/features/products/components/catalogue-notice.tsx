import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

export function CatalogueNotice({ state }: { state: "unconfigured" | "error" }) {
  return (
    <EmptyState
      title={
        state === "unconfigured"
          ? "The catalogue is not connected yet"
          : "The catalogue is unavailable"
      }
    >
      {state === "unconfigured" ? (
        <>
          Connect this development environment to the UAT Supabase project to preview the synthetic
          catalogue. Until then, no products are shown. You can still read the{" "}
          <Link href="/size-guide"> size guide</Link>.
        </>
      ) : (
        <>
          Product details could not be loaded. Please try again later, or read the{" "}
          <Link href="/size-guide"> size guide</Link>.
        </>
      )}
    </EmptyState>
  );
}

export function UatFixtureNotice() {
  return (
    <aside className="fixture-notice" aria-label="UAT test listing notice">
      <strong>UAT example — not for sale.</strong> This synthetic listing is for development checks;
      it is not a real product or offer.
    </aside>
  );
}
