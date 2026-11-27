import Link from "next/link";
import Image from "next/image";
import { CartIndicator } from "@/features/cart/components/cart-indicator";
import { StorefrontIcon } from "./storefront-icon";
import { StorefrontPrimaryNavigation } from "./storefront-primary-navigation";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
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

        <StorefrontPrimaryNavigation variant="desktop" />

        <div className="site-header__actions">
          <Link
            aria-label="Browse and search designs"
            className="icon-link icon-link--search"
            href="/shop"
          >
            <StorefrontIcon name="search" />
          </Link>
          {isSignedIn ? (
            <Link
              aria-label="Your account"
              className="icon-link icon-link--account"
              href="/account"
            >
              <StorefrontIcon name="user" />
            </Link>
          ) : (
            <Link className="site-header__login" href="/account/login">
              <StorefrontIcon name="user" size={18} />
              <span>Log in</span>
            </Link>
          )}
          <CartIndicator />
          <MobileMenu isSignedIn={isSignedIn} />
        </div>
      </div>
    </header>
  );
}
