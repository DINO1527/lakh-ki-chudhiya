import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__brand">Lakh Ki Chudhiya</p>
        <p className="site-footer__note">
          A considered collection of handcrafted lac bangles is in the works.
        </p>
        <nav aria-label="Footer navigation" className="site-footer__links">
          <Link href="/shop">Shop</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/size-guide">Size guide</Link>
        </nav>
        <p className="site-footer__copyright">© {new Date().getFullYear()} Lakh Ki Chudhiya</p>
      </div>
    </footer>
  );
}
