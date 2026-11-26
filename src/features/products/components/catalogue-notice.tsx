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
          Our collection is being prepared. No products are available to browse just yet. You can
          still read the <Link href="/size-guide"> size guide</Link>.
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
