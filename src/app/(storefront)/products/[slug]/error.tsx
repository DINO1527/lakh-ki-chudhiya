"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ProductError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="page-shell product-route-error" id="main-content">
      <div aria-hidden="true" className="product-route-error__icon">
        <AlertTriangle size={26} strokeWidth={1.6} />
      </div>
      <p className="eyebrow">Product details</p>
      <h1 className="page-heading">We couldn’t load this design</h1>
      <p>
        The product page hit a problem. You can try again, or return to the shop to keep browsing.
      </p>
      <div className="product-route-error__actions">
        <button className="button button--primary" onClick={() => reset()} type="button">
          <RefreshCw aria-hidden="true" size={17} />
          <span>Try again</span>
        </button>
        <Link className="button button--quiet" href="/shop">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Back to shop</span>
        </Link>
      </div>
    </main>
  );
}
