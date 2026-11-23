import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div>
            <p className="site-footer__brand">Lacora</p>
            <p className="site-footer__note">A romance in the circles.</p>
          </div>
          <nav aria-label="Footer navigation" className="site-footer__links">
            <Link href="/shop">Shop</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/size-guide">Size guide</Link>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">© {new Date().getFullYear()} Lacora</p>
          <p>Handcrafted lac bangles</p>
        </div>
      </div>
    </footer>
  );
}
