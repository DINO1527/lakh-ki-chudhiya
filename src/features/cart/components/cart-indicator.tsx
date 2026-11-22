"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartIndicator() {
  const { count, hydrated } = useCart();
  return (
    <Link
      aria-label={`Cart${hydrated ? `, ${count} items` : ""}`}
      className="site-nav__link"
      href="/cart"
    >
      Cart <span aria-live="polite">{hydrated ? `(${count})` : ""}</span>
    </Link>
  );
}
