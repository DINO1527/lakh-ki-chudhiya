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
            <p>A romance in the circles.</p>
          </div>

          <nav aria-label="Footer navigation" className={styles.navigation}>
            <p className={styles.navHeading}>Explore</p>
            <Link href="/shop">Shop all designs</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/size-guide">Find your size</Link>
            <Link href="/craft">The craft</Link>
          </nav>

          <div className={styles.story}>
            <p className={styles.storyEyebrow}>Made by hand. Made to be yours.</p>
            <h2>Every circle carries a story.</h2>
            <p>Meet the craft, colour, and patient detail behind handcrafted lac bangles.</p>
            <Link className={styles.storyLink} href="/craft">
              Explore the craft <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Lacora</p>
          <p>Handcrafted lac bangles · A romance in the circles.</p>
        </div>
      </div>
    </footer>
  );
}
