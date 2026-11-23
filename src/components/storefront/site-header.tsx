import Link from "next/link";
import Image from "next/image";
import { StorefrontIcon } from "./storefront-icon";

const navigation = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/size-guide", label: "Size guide" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label="Lacora home" className="wordmark" href="/">
          <Image
            alt=""
            aria-hidden="true"
            className="wordmark__mark"
            height={56}
            src="/brand/lacora-mark.webp"
            unoptimized
            width={56}
          />
          <span className="wordmark__copy">
            <span className="wordmark__name">Lacora</span>
            <span className="wordmark__caption">A romance in the circles</span>
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="site-nav site-nav--desktop"
        >
          {navigation.map(({ href, label }) => (
            <Link className="site-nav__link" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <Link
            aria-label="Browse and search designs"
            className="icon-link icon-link--search"
            href="/shop"
          >
            <StorefrontIcon name="search" />
          </Link>
          <details className="mobile-menu">
            <summary
              aria-label="Navigation menu"
              className="icon-link mobile-menu__toggle"
            >
              <span aria-hidden="true" className="mobile-menu__bars" />
            </summary>
            <nav aria-label="Mobile navigation" className="mobile-menu__panel">
              {navigation.map(({ href, label }) => (
                <Link className="mobile-menu__link" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
