"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StorefrontIcon } from "./storefront-icon";

const navigation = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/shop", label: "Shop", icon: "search" as const },
  { href: "/collections", label: "Collections", icon: "grid" as const },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Quick navigation" className="mobile-navigation">
      {navigation.map(({ href, label, icon }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            className={`mobile-navigation__link${isActive ? " is-active" : ""}`}
            href={href}
            key={label}
          >
            <span className="mobile-navigation__icon-wrap">
              <StorefrontIcon name={icon} size={21} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
