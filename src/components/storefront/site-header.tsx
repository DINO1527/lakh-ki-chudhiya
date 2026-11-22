import Link from "next/link";
import { CartIndicator } from "@/features/cart/components/cart-indicator";

const navigation = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/size-guide", label: "Size guide" },
];

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label="Lakh Ki Chudhiya home" className="wordmark" href="/">
          <span className="wordmark__name">Lakh Ki Chudhiya</span>
          <span className="wordmark__caption">Handcrafted lac bangles</span>
        </Link>

        <nav aria-label="Main navigation" className="site-nav">
          {navigation.map(({ href, label }) => (
            <Link className="site-nav__link" href={href} key={href}>
              {label}
            </Link>
          ))}
          <Link className="site-nav__link" href={isSignedIn ? "/account" : "/account/login"}>
            {isSignedIn ? "Account" : "Sign in"}
          </Link>
          <CartIndicator />
        </nav>
      </div>
    </header>
  );
}
