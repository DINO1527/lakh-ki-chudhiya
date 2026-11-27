"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StorefrontIcon } from "./storefront-icon";
import { useCart } from "@/features/cart/components/cart-provider";

const navigation = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/shop", label: "Shop", icon: "search" as const },
  { href: "/account", label: "Account", icon: "user" as const },
  { href: "/cart", label: "Bag", icon: "bag" as const },
];

export function MobileNavigation({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const { count, hydrated } = useCart();

  return (
    <nav aria-label="Quick navigation" className="mobile-navigation">
      {navigation.map(({ href, label, icon }) => {
        const destination = label === "Account" && !isSignedIn ? "/account/login" : href;
        const isActive =
          href === "/shop"
            ? pathname === "/shop" || pathname.startsWith("/products/")
            : href === "/account"
              ? pathname.startsWith("/account")
              : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={
              label === "Bag" && hydrated
                ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}`
                : label === "Account" && !isSignedIn
                  ? "Sign in to your account"
                  : label
            }
            className={`mobile-navigation__link${isActive ? " is-active" : ""}`}
            href={destination}
            key={label}
          >
            <span className="mobile-navigation__icon-wrap">
              <StorefrontIcon name={icon} size={21} />
              {label === "Bag" && hydrated && count > 0 && (
                <span aria-live="polite" className="mobile-navigation__count">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            <span>{label === "Account" && !isSignedIn ? "Log in" : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
