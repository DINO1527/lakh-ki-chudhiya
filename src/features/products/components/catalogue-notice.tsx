"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function CatalogueNotice({ state }: { state: "unconfigured" | "error" }) {
  const router = useRouter();

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
          <p className="catalogue-notice__error" role="alert">
            <AlertCircle aria-hidden="true" size={18} />
            <span>
              Product details could not be loaded. Please try again or browse another design.
            </span>
          </p>
          <div className="catalogue-notice__actions">
            <button
              className="button button--primary"
              onClick={() => router.refresh()}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={17} />
              <span>Try again</span>
            </button>
            <Link className="button button--quiet" href="/shop">
              Browse designs
            </Link>
          </div>
        </>
      )}
    </EmptyState>
  );
}
