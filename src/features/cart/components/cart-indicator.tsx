"use client";

import Link from "next/link";
import { StorefrontIcon } from "@/components/storefront/storefront-icon";
import { useCart } from "./cart-provider";

export function CartIndicator() {
  const { count, hydrated } = useCart();
  return (
    <Link
      aria-label={`Shopping bag${hydrated ? `, ${count} items` : ""}`}
      className="icon-link icon-link--cart"
      href="/cart"
    >
      <StorefrontIcon name="bag" />
      {hydrated && count > 0 && (
        <span aria-live="polite" className="cart-indicator__count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
