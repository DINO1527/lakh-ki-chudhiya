"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/size-guide", label: "Size guide" },
];

function isCurrentPage(href: string, pathname: string | null): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/shop") {
    return Boolean(pathname && (pathname === "/shop" || pathname.startsWith("/products/")));
  }
  if (href === "/size-guide") return Boolean(pathname?.startsWith("/size-guide"));
  return false;
}

export function StorefrontPrimaryNavigation({
  variant,
}: Readonly<{ variant: "desktop" | "mobile" }>) {
  const pathname = usePathname();
  const className = variant === "desktop" ? "site-nav site-nav--desktop" : "mobile-menu__links";
  const linkClassName = variant === "desktop" ? "site-nav__link" : "mobile-menu__link";

  return (
    <nav
      aria-label={variant === "desktop" ? "Main navigation" : "Store navigation"}
      className={className}
    >
      {navigation.map(({ href, label }) => {
        const isActive = isCurrentPage(href, pathname);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`${linkClassName}${isActive ? " is-active" : ""}`}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
