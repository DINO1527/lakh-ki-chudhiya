import Link from "next/link";
import { WaveDivider } from "@/components/shared/wave-divider";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={`${styles.footer} site-footer`} id="site-footer">
      <WaveDivider placement="footer" />
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandBlock}>
            <Link aria-label="Lacora home" className={styles.wordmark} href="/">
              <span aria-hidden="true" className={styles.brandSeal}>
                L
              </span>
              <span className={styles.wordmarkText}>
                <strong>Lacora</strong>
                <small>Handcrafted lac bangles</small>
              </span>
            </Link>
            <p>Explore published designs, confirmed sizes, and clear ordering details.</p>
          </div>

          <details className={styles.navigation} open>
            <summary className={styles.navHeading}>Shop</summary>
            <nav aria-label="Shop links">
              <Link href="/shop">Shop all designs</Link>
              <Link href="/shop#catalogue-collection">Browse by collection</Link>
              <Link href="/#home-catalogue">Featured designs</Link>
            </nav>
          </details>

          <details className={styles.navigation} open>
            <summary className={styles.navHeading}>Customer care</summary>
            <nav aria-label="Customer care links">
              <Link href="/size-guide">Bangle size guide</Link>
            </nav>
          </details>

          <details className={styles.navigation} open>
            <summary className={styles.navHeading}>Our story</summary>
            <nav aria-label="Story and contact links">
              <Link href="/#craftsmanship">Our craftsmanship</Link>
            </nav>
          </details>
        </div>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Lacora</p>
          <p>Handcrafted lac bangles by Lacora</p>
        </div>
      </div>
    </footer>
  );
}
